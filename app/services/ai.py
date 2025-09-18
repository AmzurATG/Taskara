import json
import re
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, ValidationError
import google.generativeai as genai
from openai import OpenAI
import requests
import time
from app.core.config import settings


# Pydantic models for structured output validation
class WorkItemCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200, description="Clear, concise title")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description")
    type: str = Field(..., pattern="^(epic|story|task|subtask)$", description="Must be one of: epic, story, task, subtask")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$", description="Priority level")
    acceptance_criteria: List[str] = Field(default_factory=list, description="List of acceptance criteria")
    estimated_hours: Optional[int] = Field(default=None, ge=1, le=1000, description="Estimated hours if specified")
    parent_reference: Optional[str] = Field(default=None, description="Reference to parent item title for subtasks/tasks")


class ParsedRequirements(BaseModel):
    work_items: List[WorkItemCreate] = Field(..., description="List of parsed work items")
    summary: str = Field(..., min_length=50, max_length=500, description="Brief summary of requirements")


class AIParser:
    def __init__(self):
        # Gemini model configurations
        self.gemini_models = [
            "gemini-1.5-flash",
            "gemini-2.0-flash-exp", 
            "gemini-2.0-flash-thinking-exp-1219"
        ]
        
        # OpenRouter model configurations (Better models for structured output)
        self.openrouter_models = [
            "anthropic/claude-3-haiku:beta",
            "meta-llama/llama-3.2-3b-instruct:free",
            "google/gemma-2-9b-it:free",
            "mistralai/mistral-7b-instruct:free"
        ]
        
        # Initialize Gemini
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_available = True
        else:
            self.gemini_available = False
        
        # Initialize OpenRouter
        self.openrouter_available = bool(settings.openrouter_api_key)
        
        # Initialize OpenAI as final fallback
        self.openai_client = OpenAI(api_key=getattr(settings, 'openai_api_key', '')) if hasattr(settings, 'openai_api_key') else None
    
    def _create_system_prompt(self) -> str:
        """Create detailed system prompt to prevent hallucination."""
        return """You are a professional business analyst tasked with parsing software requirements documents into structured work items.

CRITICAL INSTRUCTIONS:
1. ONLY extract information that is EXPLICITLY stated in the provided text
2. DO NOT add features, assumptions, or interpretations beyond what is written
3. DO NOT create work items for standard software practices unless explicitly mentioned
4. If information is unclear or missing, use "TBD" or leave optional fields empty
5. Maintain the hierarchy: Epics contain Stories, Stories contain Tasks, Tasks may have Subtasks

WORK ITEM TYPES:
- Epic: Large feature or capability spanning multiple stories (weeks/months)
- Story: User-facing functionality that delivers business value (days/weeks)  
- Task: Technical implementation work that supports a story (hours/days)
- Subtask: Granular work within a task (hours)

PARSING RULES:
1. Look for explicit functional requirements, not implementation details
2. Group related functionality into logical epics and stories
3. Only create tasks for explicitly mentioned technical work
4. Acceptance criteria must be based on stated requirements
5. Estimate hours only if time/effort is explicitly mentioned
6. Use exact wording from document when possible

REQUIRED OUTPUT FORMAT: 
You MUST return ONLY a valid JSON object with this EXACT structure:
{
  "work_items": [
    {
      "title": "string (5-200 chars)",
      "description": "string (10-2000 chars)",
      "type": "epic|story|task|subtask",
      "priority": "low|medium|high|critical",
      "acceptance_criteria": ["string1", "string2"],
      "estimated_hours": null or number,
      "parent_reference": null or "string"
    }
  ],
  "summary": "string (50-500 chars)"
}

VALIDATION REQUIREMENTS:
- Each work item must have a clear, descriptive title (5-200 chars)
- Descriptions must be detailed and specific (10-2000 chars)
- Type must be exactly: "epic", "story", "task", or "subtask"
- Priority must be exactly: "low", "medium", "high", or "critical"
- Parent references must match exact titles of parent items
- Acceptance criteria should be measurable and testable
- Do NOT include any text outside the JSON object
- Ensure the JSON is valid and properly formatted

Remember: Quality over quantity. It's better to create fewer, well-defined work items than many vague ones."""

    def _create_user_prompt(self, text_chunk: str) -> str:
        """Create user prompt with the text to analyze."""
        return f"""Analyze the following requirements text and extract work items according to the system instructions.

REQUIREMENTS TEXT:
{text_chunk}

Parse this text into structured work items. Return ONLY valid JSON matching the ParsedRequirements schema. Do not include any explanatory text outside the JSON."""

    def _clean_json_response(self, response_text: str) -> str:
        """Clean and fix common JSON issues in AI responses."""
        try:
            # Remove any text before the first { and after the last }
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}')
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No JSON object found in response")
            
            json_str = response_text[start_idx:end_idx + 1]
            
            # Fix common JSON issues
            # Remove trailing commas before closing braces/brackets
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
            
            # Fix unescaped quotes in strings
            json_str = re.sub(r'(?<!\\)"(?=(?:[^"\\]|\\.)*(\\\\)*$)', r'\\"', json_str)
            
            # Fix single quotes to double quotes (but not in content)
            json_str = re.sub(r"(?<=[{,\[])\s*'([^']+)'(?=\s*:)", r'"\1"', json_str)
            json_str = re.sub(r"(?<=:\s*)'([^']*)'(?=\s*[,}\]])", r'"\1"', json_str)
            
            # Remove any control characters
            json_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', json_str)
            
            return json_str
            
        except Exception as e:
            # Fallback: try to extract anything that looks like JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json_match.group()
            else:
                raise ValueError(f"Could not extract valid JSON: {str(e)}")

    def _validate_and_clean_response(self, response_text: str) -> Dict[str, Any]:
        """Validate and clean the LLM response with robust parsing for various formats."""
        try:
            # Clean the response text first
            cleaned_response = self._clean_json_response(response_text)
            
            # Parse JSON
            parsed_data = json.loads(cleaned_response)
            
            # Handle various response structures
            if 'ParsedRequirements' in parsed_data:
                if isinstance(parsed_data['ParsedRequirements'], list):
                    # If it's a list, assume it's work_items and create proper structure
                    parsed_data = {
                        'work_items': self._normalize_work_items(parsed_data['ParsedRequirements']),
                        'summary': 'AI-generated work items from requirements analysis'
                    }
                else:
                    parsed_data = parsed_data['ParsedRequirements']
            
            # Handle separate epics, stories, tasks format
            if 'epics' in parsed_data or 'stories' in parsed_data or 'tasks' in parsed_data:
                merged_items = []
                
                # Merge epics
                if 'epics' in parsed_data:
                    for epic in parsed_data['epics']:
                        epic['type'] = 'epic'
                        merged_items.append(epic)
                
                # Merge stories  
                if 'stories' in parsed_data:
                    for story in parsed_data['stories']:
                        story['type'] = 'story'
                        merged_items.append(story)
                
                # Merge tasks
                if 'tasks' in parsed_data:
                    for task in parsed_data['tasks']:
                        task['type'] = 'task'
                        merged_items.append(task)
                
                # Merge subtasks
                if 'subtasks' in parsed_data:
                    for subtask in parsed_data['subtasks']:
                        subtask['type'] = 'subtask'
                        merged_items.append(subtask)
                
                parsed_data = {
                    'work_items': merged_items,
                    'summary': parsed_data.get('summary', 'AI-generated work items from requirements analysis')
                }
            
            # Ensure we have the required structure
            if 'work_items' not in parsed_data and 'workItems' not in parsed_data:
                if isinstance(parsed_data, list):
                    # If the whole response is a list, treat as work_items
                    parsed_data = {
                        'work_items': self._normalize_work_items(parsed_data),
                        'summary': 'AI-generated work items from requirements analysis'
                    }
                elif isinstance(parsed_data, dict):
                    # Check if this is a single work item
                    if 'title' in parsed_data and 'description' in parsed_data:
                        parsed_data = {
                            'work_items': self._normalize_work_items([parsed_data]),
                            'summary': 'AI-generated work items from requirements analysis'
                        }
                    # Check for nested structures with different field names
                    elif any(key in parsed_data for key in ['items', 'requirements', 'features', 'tasks']):
                        items_key = next((key for key in ['items', 'requirements', 'features', 'tasks'] if key in parsed_data), None)
                        if items_key and isinstance(parsed_data[items_key], list):
                            parsed_data = {
                                'work_items': self._normalize_work_items(parsed_data[items_key]),
                                'summary': parsed_data.get('summary', 'AI-generated work items from requirements analysis')
                            }
                        else:
                            raise ValueError("Response missing 'work_items' or 'workItems' field")
                    else:
                        raise ValueError("Response missing 'work_items' or 'workItems' field")
                else:
                    raise ValueError("Response missing 'work_items' or 'workItems' field")
            else:
                # Handle both snake_case and camelCase
                work_items_key = 'work_items' if 'work_items' in parsed_data else 'workItems'
                parsed_data['work_items'] = self._normalize_work_items(parsed_data[work_items_key])
                
                # Remove the camelCase version if it exists
                if 'workItems' in parsed_data and work_items_key == 'workItems':
                    del parsed_data['workItems']
            
            if 'summary' not in parsed_data:
                parsed_data['summary'] = 'AI-generated work items from requirements analysis'
            
            # Validate with Pydantic
            validated_data = ParsedRequirements(**parsed_data)
            
            # Handle empty work_items list by creating a default item
            if not validated_data.work_items:
                default_item = WorkItemCreate(
                    title="Requirements Analysis Needed",
                    description="The AI was unable to extract specific work items from this document chunk. Manual review and breakdown is recommended.",
                    type="task",
                    priority="medium",
                    acceptance_criteria=["Document has been manually reviewed", "Work items have been properly defined"]
                )
                validated_data.work_items = [default_item]
            
            return validated_data.dict()
        
        except (json.JSONDecodeError, ValidationError) as e:
            # Log the problematic response for debugging
            print(f"JSON Parse Error: {str(e)}")
            print(f"Raw response (first 1000 chars): {response_text[:1000]}")
            print(f"Cleaned response attempt: {self._clean_json_response(response_text)[:500] if hasattr(self, '_clean_json_response') else 'N/A'}")
            raise ValueError(f"Invalid response format: {str(e)}")
        except Exception as e:
            print(f"Unexpected parsing error: {str(e)}")
            print(f"Response type: {type(response_text)}")
            print(f"Response content (first 500 chars): {str(response_text)[:500]}")
            raise ValueError(f"Failed to parse AI response: {str(e)}")

    def _normalize_work_items(self, work_items: List[Any]) -> List[Dict[str, Any]]:
        """Normalize work items from various AI model response formats."""
        normalized_items = []
        
        for item in work_items:
            if isinstance(item, dict):
                # Handle nested structures like {'Epic': {...}}, {'Story': {...}}
                if len(item) == 1 and list(item.keys())[0] in ['Epic', 'Story', 'Task', 'Subtask']:
                    item_type = list(item.keys())[0].lower()
                    item_data = list(item.values())[0]
                    
                    normalized_item = {
                        'title': item_data.get('title', ''),
                        'description': item_data.get('description', ''),
                        'type': item_type,
                        'priority': item_data.get('priority', 'medium'),
                        'acceptance_criteria': item_data.get('acceptanceCriteria', item_data.get('acceptance_criteria', [])),
                        'estimated_hours': item_data.get('estimatedHours', item_data.get('estimated_hours')),
                        'parent_reference': item_data.get('parentReference', item_data.get('parent_reference', item_data.get('parent')))
                    }
                    
                # Handle direct format with all fields present
                elif 'title' in item and 'description' in item and 'type' in item:
                    normalized_item = {
                        'title': item['title'],
                        'description': item['description'],
                        'type': item['type'],
                        'priority': item.get('priority', 'medium'),
                        'acceptance_criteria': item.get('acceptance_criteria', item.get('acceptanceCriteria', [])),
                        'estimated_hours': item.get('estimated_hours', item.get('estimatedHours')),
                        'parent_reference': item.get('parent_reference', item.get('parentReference', item.get('parent')))
                    }
                
                # Handle partial structures - try to extract what we can
                else:
                    normalized_item = {
                        'title': item.get('title', 'Untitled Work Item'),
                        'description': item.get('description', 'No description provided'),
                        'type': item.get('type', 'task'),
                        'priority': item.get('priority', 'medium'),
                        'acceptance_criteria': item.get('acceptance_criteria', item.get('acceptanceCriteria', [])),
                        'estimated_hours': item.get('estimated_hours', item.get('estimatedHours')),
                        'parent_reference': item.get('parent_reference', item.get('parentReference', item.get('parent')))
                    }
                
                # Clean up None values and ensure proper types
                if normalized_item['acceptance_criteria'] is None:
                    normalized_item['acceptance_criteria'] = []
                if not isinstance(normalized_item['acceptance_criteria'], list):
                    normalized_item['acceptance_criteria'] = [str(normalized_item['acceptance_criteria'])]
                
                normalized_items.append(normalized_item)
        
        return normalized_items

    def _is_quota_exceeded(self, error_message: str) -> bool:
        """Check if the error indicates quota exceeded."""
        quota_indicators = [
            "quota exceeded",
            "rate limit", 
            "resource exhausted",
            "insufficient quota",
            "too many requests",
            "429"
        ]
        error_lower = error_message.lower()
        return any(indicator in error_lower for indicator in quota_indicators)

    def _call_gemini(self, user_prompt: str) -> str:
        """Call Gemini API with model fallback."""
        if not self.gemini_available:
            raise Exception("Gemini API not configured")
        
        full_prompt = f"{self._create_system_prompt()}\n\n{user_prompt}"
        
        for model_name in self.gemini_models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=4000,
                    )
                )
                print(f"Gemini {model_name} raw response: {response.text[:300]}...")
                return response.text
                
            except Exception as e:
                error_str = str(e)
                print(f"Gemini {model_name} failed: {error_str}")
                
                # If quota exceeded, try next model
                if self._is_quota_exceeded(error_str):
                    continue
                else:
                    # For other errors, also try next model but log differently
                    print(f"Non-quota error with {model_name}, trying next model")
                    continue
        
        # All Gemini models failed
        raise Exception(f"All Gemini models failed")

    def _call_openrouter(self, user_prompt: str) -> str:
        """Call OpenRouter API with model fallback."""
        if not self.openrouter_available:
            raise Exception("OpenRouter API not configured")
        
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json"
        }
        
        for model_name in self.openrouter_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": self._create_system_prompt()},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 4000,
                    "top_p": 0.8
                }
                
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code == 200:
                    result = response.json()
                    response_text = result["choices"][0]["message"]["content"]
                    print(f"OpenRouter {model_name} raw response: {response_text[:300]}...")
                    return response_text
                else:
                    error_msg = f"OpenRouter {model_name} HTTP {response.status_code}: {response.text}"
                    print(error_msg)
                    
                    # If quota/rate limit, try next model
                    if response.status_code in [429, 403] or self._is_quota_exceeded(response.text):
                        continue
                    else:
                        continue
                        
            except Exception as e:
                print(f"OpenRouter {model_name} failed: {str(e)}")
                continue
        
        raise Exception("All OpenRouter models failed")

    def _call_openai(self, user_prompt: str) -> str:
        """Call OpenAI API as fallback."""
        if not self.openai_client:
            raise Exception("OpenAI API not configured")
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self._create_system_prompt()},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for consistent output
                max_tokens=4000,
                top_p=0.8
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    def parse_requirements_chunk(self, text_chunk: str, chunk_index: int = 0) -> Dict[str, Any]:
        """Parse a chunk of requirements text into structured work items with intelligent fallback."""
        if not text_chunk.strip():
            raise ValueError("Empty text chunk provided")
        
        user_prompt = self._create_user_prompt(text_chunk)
        errors = []
        
        # Try Gemini models first
        if self.gemini_available:
            try:
                response = self._call_gemini(user_prompt)
                return self._validate_and_clean_response(response)
            except Exception as gemini_error:
                error_msg = f"All Gemini models failed for chunk {chunk_index}: {gemini_error}"
                print(error_msg)
                errors.append(error_msg)
        
        # Try OpenRouter models
        if self.openrouter_available:
            try:
                response = self._call_openrouter(user_prompt)
                return self._validate_and_clean_response(response)
            except Exception as openrouter_error:
                error_msg = f"All OpenRouter models failed for chunk {chunk_index}: {openrouter_error}"
                print(error_msg)
                errors.append(error_msg)
        
        # Final fallback to OpenAI
        if self.openai_client:
            try:
                response = self._call_openai(user_prompt)
                return self._validate_and_clean_response(response)
            except Exception as openai_error:
                error_msg = f"OpenAI fallback failed for chunk {chunk_index}: {openai_error}"
                print(error_msg)
                errors.append(error_msg)
        
        # Ultimate fallback: create a basic work item from the text
        print(f"Creating fallback work item for chunk {chunk_index}")
        fallback_item = WorkItemCreate(
            title=f"Requirements Analysis - Chunk {chunk_index + 1}",
            description=f"Manual review needed for this requirements section: {text_chunk[:200]}{'...' if len(text_chunk) > 200 else ''}",
            type="task",
            priority="medium",
            acceptance_criteria=[
                "Requirements text has been manually reviewed",
                "Proper work items have been created from this section"
            ]
        )
        
        fallback_response = ParsedRequirements(
            work_items=[fallback_item],
            summary=f"Fallback work item created for chunk {chunk_index + 1} due to AI parsing failures"
        )
        
        return fallback_response.dict()

    def chunk_text(self, text: str, max_chunk_size: int = 3000) -> List[str]:
        """Split text into manageable chunks for AI processing."""
        if len(text) <= max_chunk_size:
            return [text]
        
        chunks = []
        words = text.split()
        current_chunk = []
        current_size = 0
        
        for word in words:
            word_size = len(word) + 1  # +1 for space
            
            if current_size + word_size > max_chunk_size and current_chunk:
                # Finish current chunk
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_size = word_size
            else:
                current_chunk.append(word)
                current_size += word_size
        
        # Add last chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks

    def parse_requirements_document(self, text: str) -> List[Dict[str, Any]]:
        """Parse entire requirements document into work items."""
        if not text.strip():
            raise ValueError("Empty document provided")
        
        # Split into chunks
        chunks = self.chunk_text(text)
        all_results = []
        
        for i, chunk in enumerate(chunks):
            try:
                result = self.parse_requirements_chunk(chunk, i)
                all_results.append(result)
            except Exception as e:
                print(f"Failed to parse chunk {i}: {e}")
                # Continue with other chunks
                continue
        
        if not all_results:
            raise Exception("Failed to parse any chunks of the document")
        
        return all_results


# Global AI parser instance
ai_parser = AIParser()
