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
      "title": "string (5-200 characters)",
      "description": "string (10-2000 characters)",
      "type": "epic|story|task|subtask",
      "priority": "low|medium|high|critical",
      "acceptance_criteria": ["string1", "string2"],
      "estimated_hours": null or integer,
      "parent_reference": null or "exact title of parent item"
    }
  ],
  "summary": "string (50-500 characters)"
}

CRITICAL: 
- Return ONLY the JSON object, no explanatory text
- Do not wrap in markdown code blocks
- Ensure all strings are properly escaped
- The "work_items" field is REQUIRED and must be an array
- Each work item MUST have title, description, and type fields
- Type must be exactly one of: "epic", "story", "task", "subtask"
- Priority must be exactly one of: "low", "medium", "high", "critical"

VALIDATION REQUIREMENTS:
- Each work item must have a clear, descriptive title (5-200 chars)
- Descriptions must be detailed and specific (10-2000 chars)
- Parent references must match exact titles of parent items
- Acceptance criteria should be measurable and testable

Remember: Quality over quantity. It's better to create fewer, well-defined work items than many vague ones."""

    def _create_user_prompt(self, text_chunk: str) -> str:
        """Create user prompt with the text to analyze."""
        return f"""Analyze the following requirements text and extract work items according to the system instructions.

REQUIREMENTS TEXT:
{text_chunk}

Parse this text into structured work items and return ONLY a valid JSON object with this exact structure:

{{
  "work_items": [
    {{
      "title": "Clear work item title",
      "description": "Detailed description of the work",
      "type": "epic|story|task|subtask",
      "priority": "low|medium|high|critical",
      "acceptance_criteria": ["criteria 1", "criteria 2"],
      "estimated_hours": null,
      "parent_reference": null
    }}
  ],
  "summary": "Brief summary of the requirements analyzed"
}}

CRITICAL: Return ONLY the JSON object. Do not include any explanatory text, markdown formatting, or code blocks."""

    def _validate_and_clean_response(self, response_text: str) -> Dict[str, Any]:
        """Validate and clean the LLM response with robust parsing for various formats."""
        try:
            # First, try to extract and clean the JSON from the response
            json_str = self._extract_json_from_response(response_text)
            
            # Parse JSON
            parsed_data = json.loads(json_str)
            
            # Convert to the required format with comprehensive handling
            normalized_data = self._normalize_response_structure(parsed_data)
            
            # Validate with Pydantic
            validated_data = ParsedRequirements(**normalized_data)
            
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
            print(f"Failed to parse response: {response_text[:500]}...")
            # Create a fallback response instead of failing completely
            return self._create_fallback_response(response_text, str(e))
        
        except Exception as e:
            print(f"Unexpected error parsing response: {response_text[:500]}...")
            return self._create_fallback_response(response_text, str(e))

    def _extract_json_from_response(self, response_text: str) -> str:
        """Extract JSON from response text, handling various formats."""
        # Remove common prefixes and suffixes that AI models add
        cleaned_text = response_text.strip()
        
        # Remove markdown code blocks
        if cleaned_text.startswith('```json'):
            cleaned_text = cleaned_text[7:]
        elif cleaned_text.startswith('```'):
            cleaned_text = cleaned_text[3:]
        
        if cleaned_text.endswith('```'):
            cleaned_text = cleaned_text[:-3]
        
        # Remove leading/trailing whitespace
        cleaned_text = cleaned_text.strip()
        
        # Try to find JSON object boundaries
        json_match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
        if json_match:
            return json_match.group()
        
        # If no clear JSON boundaries, try the whole text
        return cleaned_text

    def _normalize_response_structure(self, parsed_data: Any) -> Dict[str, Any]:
        """Normalize various response structures to the expected format."""
        result = {
            'work_items': [],
            'summary': 'AI-generated work items from requirements analysis'
        }
        
        # Handle if the response is directly a list of work items
        if isinstance(parsed_data, list):
            result['work_items'] = self._normalize_work_items(parsed_data)
            return result
        
        # Handle if the response is not a dict
        if not isinstance(parsed_data, dict):
            # Try to extract meaningful information from the response
            result['work_items'] = [self._create_fallback_work_item(str(parsed_data))]
            return result
        
        # Handle nested ParsedRequirements structure
        if 'ParsedRequirements' in parsed_data:
            if isinstance(parsed_data['ParsedRequirements'], list):
                result['work_items'] = self._normalize_work_items(parsed_data['ParsedRequirements'])
                return result
            elif isinstance(parsed_data['ParsedRequirements'], dict):
                parsed_data = parsed_data['ParsedRequirements']
        
        # Handle separate epics, stories, tasks format
        if any(key in parsed_data for key in ['epics', 'stories', 'tasks', 'subtasks']):
            merged_items = []
            
            for item_type in ['epics', 'stories', 'tasks', 'subtasks']:
                if item_type in parsed_data:
                    for item in parsed_data[item_type]:
                        if isinstance(item, dict):
                            item['type'] = item_type[:-1]  # Remove 's' from plural
                            merged_items.append(item)
            
            result['work_items'] = self._normalize_work_items(merged_items)
            result['summary'] = parsed_data.get('summary', result['summary'])
            return result
        
        # Handle direct work_items or workItems field
        work_items_data = None
        if 'work_items' in parsed_data:
            work_items_data = parsed_data['work_items']
        elif 'workItems' in parsed_data:
            work_items_data = parsed_data['workItems']
        elif 'items' in parsed_data:
            work_items_data = parsed_data['items']
        elif 'requirements' in parsed_data:
            work_items_data = parsed_data['requirements']
        
        if work_items_data is not None:
            result['work_items'] = self._normalize_work_items(work_items_data)
            result['summary'] = parsed_data.get('summary', result['summary'])
            return result
        
        # Try to extract work items from any list-like field
        for key, value in parsed_data.items():
            if isinstance(value, list) and value:
                # Check if this looks like a list of work items
                first_item = value[0]
                if isinstance(first_item, dict) and any(field in first_item for field in ['title', 'description', 'name']):
                    result['work_items'] = self._normalize_work_items(value)
                    result['summary'] = parsed_data.get('summary', result['summary'])
                    return result
        
        # If we still don't have work items, create one from the entire response
        if not result['work_items']:
            result['work_items'] = [self._create_fallback_work_item(str(parsed_data))]
        
        return result

    def _create_fallback_work_item(self, content: str) -> Dict[str, Any]:
        """Create a fallback work item when parsing fails."""
        return {
            'title': 'AI Parsing Required',
            'description': f'The AI response could not be parsed into structured work items. Raw content: {content[:500]}...',
            'type': 'task',
            'priority': 'medium',
            'acceptance_criteria': ['Parse AI response manually', 'Create proper work items'],
            'estimated_hours': None,
            'parent_reference': None
        }

    def _create_fallback_response(self, response_text: str, error_msg: str) -> Dict[str, Any]:
        """Create a fallback response when all parsing attempts fail."""
        fallback_item = WorkItemCreate(
            title="AI Response Parsing Failed",
            description=f"Failed to parse AI response: {error_msg}. Raw response: {response_text[:300]}...",
            type="task",
            priority="high",
            acceptance_criteria=["Review AI response manually", "Extract work items manually"],
            estimated_hours=2
        )
        
        return {
            'work_items': [fallback_item.dict()],
            'summary': f'AI parsing failed: {error_msg}'
        }

    def _normalize_work_items(self, work_items: List[Any]) -> List[Dict[str, Any]]:
        """Normalize work items from various AI model response formats."""
        normalized_items = []
        
        if not work_items:
            return normalized_items
        
        for item in work_items:
            try:
                normalized_item = None
                
                if isinstance(item, dict):
                    # Handle nested structures like {'Epic': {...}}, {'Story': {...}}
                    if len(item) == 1 and list(item.keys())[0] in ['Epic', 'Story', 'Task', 'Subtask']:
                        item_type = list(item.keys())[0].lower()
                        item_data = list(item.values())[0]
                        
                        if isinstance(item_data, dict):
                            normalized_item = {
                                'title': item_data.get('title', item_data.get('name', 'Untitled Work Item')),
                                'description': item_data.get('description', item_data.get('desc', 'No description provided')),
                                'type': item_type,
                                'priority': item_data.get('priority', 'medium'),
                                'acceptance_criteria': self._normalize_acceptance_criteria(
                                    item_data.get('acceptanceCriteria', 
                                    item_data.get('acceptance_criteria',
                                    item_data.get('criteria', [])))
                                ),
                                'estimated_hours': item_data.get('estimatedHours', item_data.get('estimated_hours')),
                                'parent_reference': item_data.get('parentReference', 
                                                   item_data.get('parent_reference', 
                                                   item_data.get('parent')))
                            }
                    
                    # Handle direct format with all fields present
                    elif 'title' in item or 'name' in item:
                        normalized_item = {
                            'title': item.get('title', item.get('name', 'Untitled Work Item')),
                            'description': item.get('description', item.get('desc', 'No description provided')),
                            'type': item.get('type', 'task').lower(),
                            'priority': item.get('priority', 'medium').lower(),
                            'acceptance_criteria': self._normalize_acceptance_criteria(
                                item.get('acceptance_criteria', 
                                item.get('acceptanceCriteria',
                                item.get('criteria', [])))
                            ),
                            'estimated_hours': item.get('estimated_hours', item.get('estimatedHours')),
                            'parent_reference': item.get('parent_reference', 
                                               item.get('parentReference', 
                                               item.get('parent')))
                        }
                    
                    # Handle partial structures - try to extract what we can
                    else:
                        # Look for any field that might contain a title or description
                        title_candidates = [item.get(key) for key in ['title', 'name', 'summary', 'task'] if item.get(key)]
                        desc_candidates = [item.get(key) for key in ['description', 'desc', 'details', 'content'] if item.get(key)]
                        
                        normalized_item = {
                            'title': title_candidates[0] if title_candidates else 'Extracted Work Item',
                            'description': desc_candidates[0] if desc_candidates else str(item)[:200],
                            'type': item.get('type', 'task').lower(),
                            'priority': item.get('priority', 'medium').lower(),
                            'acceptance_criteria': self._normalize_acceptance_criteria(
                                item.get('acceptance_criteria', 
                                item.get('acceptanceCriteria',
                                item.get('criteria', [])))
                            ),
                            'estimated_hours': item.get('estimated_hours', item.get('estimatedHours')),
                            'parent_reference': item.get('parent_reference', 
                                               item.get('parentReference', 
                                               item.get('parent')))
                        }
                
                elif isinstance(item, str):
                    # Handle string items - create a basic work item
                    normalized_item = {
                        'title': item[:100] if len(item) > 100 else item,
                        'description': item,
                        'type': 'task',
                        'priority': 'medium',
                        'acceptance_criteria': [],
                        'estimated_hours': None,
                        'parent_reference': None
                    }
                
                if normalized_item:
                    # Validate and clean the normalized item
                    normalized_item = self._clean_normalized_item(normalized_item)
                    normalized_items.append(normalized_item)
                    
            except Exception as e:
                print(f"Error normalizing work item {item}: {e}")
                # Create a fallback item
                fallback_item = {
                    'title': 'Failed to Parse Work Item',
                    'description': f'Could not parse work item: {str(item)[:200]}',
                    'type': 'task',
                    'priority': 'medium',
                    'acceptance_criteria': ['Review and fix parsing'],
                    'estimated_hours': None,
                    'parent_reference': None
                }
                normalized_items.append(fallback_item)
        
        return normalized_items

    def _normalize_acceptance_criteria(self, criteria: Any) -> List[str]:
        """Normalize acceptance criteria to a list of strings."""
        if criteria is None:
            return []
        
        if isinstance(criteria, str):
            # Split by common delimiters
            if '\n' in criteria:
                return [c.strip() for c in criteria.split('\n') if c.strip()]
            elif ';' in criteria:
                return [c.strip() for c in criteria.split(';') if c.strip()]
            elif ',' in criteria:
                return [c.strip() for c in criteria.split(',') if c.strip()]
            else:
                return [criteria.strip()]
        
        if isinstance(criteria, list):
            result = []
            for item in criteria:
                if isinstance(item, str):
                    result.append(item.strip())
                else:
                    result.append(str(item).strip())
            return [c for c in result if c]
        
        # For any other type, convert to string
        return [str(criteria).strip()]

    def _clean_normalized_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and validate a normalized work item."""
        # Ensure title length
        if len(item['title']) < 5:
            item['title'] = f"Work Item: {item['title']}"
        if len(item['title']) > 200:
            item['title'] = item['title'][:197] + "..."
        
        # Ensure description length
        if len(item['description']) < 10:
            item['description'] = f"Work item description: {item['description']}"
        if len(item['description']) > 2000:
            item['description'] = item['description'][:1997] + "..."
        
        # Validate type
        valid_types = ['epic', 'story', 'task', 'subtask']
        if item['type'] not in valid_types:
            item['type'] = 'task'
        
        # Validate priority
        valid_priorities = ['low', 'medium', 'high', 'critical']
        if item['priority'] not in valid_priorities:
            item['priority'] = 'medium'
        
        # Ensure acceptance_criteria is a list
        if not isinstance(item['acceptance_criteria'], list):
            item['acceptance_criteria'] = []
        
        # Clean up estimated_hours
        if item['estimated_hours'] is not None:
            try:
                item['estimated_hours'] = int(item['estimated_hours'])
                if item['estimated_hours'] <= 0 or item['estimated_hours'] > 1000:
                    item['estimated_hours'] = None
            except (ValueError, TypeError):
                item['estimated_hours'] = None
        
        # Clean up parent_reference
        if item['parent_reference'] and not isinstance(item['parent_reference'], str):
            item['parent_reference'] = str(item['parent_reference'])
        if item['parent_reference'] and not item['parent_reference'].strip():
            item['parent_reference'] = None
        
        return item

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
                
                # Configure generation with more specific parameters for JSON output
                generation_config = genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistent JSON output
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=4000,
                    candidate_count=1  # Only generate one candidate
                )
                
                # Add safety settings to prevent blocking
                safety_settings = [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_NONE"
                    }
                ]
                
                response = model.generate_content(
                    full_prompt,
                    generation_config=generation_config,
                    safety_settings=safety_settings
                )
                
                # Check if response was blocked
                if response.candidates and response.candidates[0].finish_reason == 2:  # SAFETY
                    print(f"Gemini {model_name} response was blocked by safety filters")
                    continue
                
                # Check if we have valid response text
                if not response.text or not response.text.strip():
                    print(f"Gemini {model_name} returned empty response")
                    continue
                
                print(f"Gemini {model_name} response preview: {response.text[:200]}...")
                return response.text
                
            except Exception as e:
                error_str = str(e)
                print(f"Gemini {model_name} failed: {error_str}")
                
                # Check for specific error types
                if "blocked" in error_str.lower() or "safety" in error_str.lower():
                    print(f"Safety filter blocked response from {model_name}")
                    continue
                elif self._is_quota_exceeded(error_str):
                    print(f"Quota exceeded for {model_name}")
                    continue
                elif "not found" in error_str.lower() or "invalid" in error_str.lower():
                    print(f"Model {model_name} not available or invalid")
                    continue
                else:
                    # For other errors, also try next model but log differently
                    print(f"Non-quota error with {model_name}, trying next model: {error_str}")
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
                    print(f"OpenRouter {model_name} response preview: {response_text[:200]}...")
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
        
        # All services failed
        all_errors = "; ".join(errors)
        raise Exception(f"All AI services failed for chunk {chunk_index}. Errors: {all_errors}")

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
