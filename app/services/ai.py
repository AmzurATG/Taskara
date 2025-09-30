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


class ConsolidatedEpic(BaseModel):
    title: str = Field(..., min_length=10, max_length=100, description="Business-friendly epic title")
    description: str = Field(..., min_length=50, max_length=1000, description="Comprehensive epic description")
    category: str = Field(..., description="Business domain category")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$", description="Priority level")
    acceptance_criteria: List[str] = Field(default_factory=list, description="High-level business outcomes")
    consolidated_requirements: List[str] = Field(default_factory=list, description="Original requirements merged into this epic")


class EpicConsolidationResult(BaseModel):
    consolidated_epics: List[ConsolidatedEpic] = Field(default_factory=list, description="List of consolidated epics")
    summary: str = Field(..., min_length=10, max_length=1000, description="Consolidation overview")


class EpicBreakdownResult(BaseModel):
    work_items: List[WorkItemCreate] = Field(default_factory=list, description="Detailed work items from epic breakdown")
    epic_title: str = Field(..., description="Title of epic being broken down")
    summary: str = Field(..., min_length=10, max_length=1000, description="Breakdown overview")


class ParsedRequirements(BaseModel):
    work_items: List[WorkItemCreate] = Field(default_factory=list, description="List of parsed work items")
    summary: str = Field(..., min_length=10, max_length=500, description="Brief summary of requirements")


class AIParser:
    def __init__(self):
        # Gemini model configurations
        self.gemini_models = [
            "gemini-1.5-flash",
            "gemini-2.0-flash-exp", 
            "gemini-2.0-flash-thinking-exp-1219"
        ]
        
        # Initialize Gemini
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_available = True
        else:
            self.gemini_available = False
        
        # Initialize OpenRouter as fallback
        self.openrouter_available = bool(settings.openrouter_api_key)
        
        # Better OpenRouter models for structured output
        self.openrouter_models = [
            "anthropic/claude-3-haiku:beta",  # Best for structured output
            "meta-llama/llama-3.1-8b-instruct:free",  # Good instruction following
            "google/gemma-2-9b-it:free"  # Similar to Gemini
        ]
    
    def _create_epic_consolidation_prompt(self) -> str:
        """Create system prompt for first pass: extracting and consolidating epics."""
        return """You are a professional business analyst tasked with identifying ONLY the most critical, high-level features (epics) from software requirements documents.

CRITICAL INSTRUCTIONS FOR EPIC CONSOLIDATION:
1. ONLY extract the 3-5 MOST IMPORTANT business capabilities from the document.
2. Aggressively group ALL RELATED requirements into single, broad epics.
3. Focus on major business value and user-facing functionality, not technical implementation details.
4. Each epic should cover multiple related requirements and represent significant business value.
5. Eliminate redundant, minor, or purely technical features.
6. Maximum 5 epics total - prefer fewer, broader groupings.

CONSOLIDATION APPROACH:
1. Identify the core business domain and purpose of the application
2. Group requirements by major functional areas or user workflows
3. Merge similar capabilities regardless of specific implementation details
4. Focus on what users will accomplish, not how it's built
5. Each epic should represent weeks/months of development effort
6. Use business-friendly language that stakeholders would understand

GENERAL EPIC PATTERNS (ADAPT TO YOUR DOMAIN):
- User/Account Management (authentication, profiles, permissions, user lifecycle)
- Core Business Logic (main application functionality, primary workflows)
- Data Management (content creation, processing, storage, reporting)
- Communication & Interaction (messaging, notifications, collaboration)
- Integration & Administration (external systems, admin tools, configuration)

CONSOLIDATION RULES:
- If requirements mention user registration, login, profiles, permissions → "User Management"
- If requirements focus on main business processes → "Core [Domain] Operations"
- If requirements involve data entry, processing, reporting → "Data Management"
- If requirements include messaging, notifications, communication → "Communication"
- If requirements mention external APIs, admin functions → "System Integration"

OUTPUT FORMAT:
Return ONLY a valid JSON object:

{
  "consolidated_epics": [
    {
      "title": "string (broad business capability in domain context)",
      "description": "string (comprehensive coverage explaining business value)",
      "category": "string (functional domain based on requirements)",
      "priority": "high|critical",
      "acceptance_criteria": ["major business outcomes and user goals"],
      "consolidated_requirements": ["ALL original requirements merged into this epic"]
    }
  ],
  "summary": "string (consolidation overview explaining grouping rationale)"
}

REMEMBER: Adapt categories to the actual business domain. Maximum 5 epics. Each epic should consolidate multiple requirements. Be extremely aggressive in grouping related functionality."""

    def _create_epic_breakdown_prompt(self) -> str:
        """Create system prompt for second pass: breaking epics into minimal essential work items."""
        return """You are a professional business analyst tasked with breaking down epics into essential work items with proper hierarchy.

CRITICAL INSTRUCTIONS FOR BREAKDOWN:
1. Break down each epic into 1-2 most critical user stories that deliver core business value.
2. Create 1-2 essential implementation tasks per story.
3. For complex epics with multiple features/requirements (5+ consolidated requirements), create subtasks under major tasks.
4. Focus on MVP (Minimum Viable Product) features that users need most.
5. Maximum 6 total work items per epic breakdown (including subtasks).
6. Eliminate nice-to-have features, edge cases, and administrative overhead.

HIERARCHY REQUIREMENTS:
- ALWAYS include subtasks for epics that consolidate 5+ requirements
- Complex tasks (estimated > 40 hours) should be broken into 2-3 subtasks
- Subtasks should represent granular, actionable work units (4-16 hours each)
- Use exact parent task title in parent_reference for subtasks

BREAKDOWN PHILOSOPHY:
- Start with core user needs and business value
- Focus on functionality users interact with directly
- Prioritize features that differentiate the application
- For complex epics, drill down to implementable work units
- Each story should solve a real user problem
- Each task should be a meaningful development milestone
- Each subtask should be a specific, actionable work item

WORK ITEM GUIDELINES:
- Story: Core user-facing functionality that delivers immediate business value (1-3 weeks effort)
- Task: Major implementation component that enables the story (1-2 weeks effort)
- Subtask: Granular implementation work within a task (3-15 hours effort)

SUBTASK GENERATION RULES:
- If epic has 5+ consolidated requirements → MUST include subtasks
- If task involves multiple technical components → break into subtasks
- If task spans frontend + backend + database → create subtasks for each
- Common subtask patterns: "Design UI components", "Implement API endpoints", "Create database schema", "Add validation logic"

QUALITY OVER QUANTITY:
- Better to have fewer well-defined items with proper hierarchy
- Each work item should be something users would notice and value
- Subtasks ensure complex work is manageable and trackable
- Focus on the 20% of features that deliver 80% of the value

OUTPUT FORMAT:
Return ONLY a valid JSON object:

{
  "work_items": [
    {
      "title": "string (essential user-facing feature or implementation component)",
      "description": "string (focused on core business value and user benefit)",
      "type": "story|task|subtask",
      "priority": "high|critical",
      "acceptance_criteria": ["essential, testable criteria that define success"],
      "estimated_hours": null or number,
      "parent_reference": null or "exact parent title"
    }
  ],
  "epic_title": "string (title of epic being broken down)",
  "summary": "string (explanation of breakdown focusing on business value and hierarchy)"
}

REMEMBER: Maximum 5 work items per epic. Focus on absolute essentials that deliver real user value. No administrative or setup tasks unless critical to core functionality."""

    def _create_epic_consolidation_user_prompt(self, text_chunk: str, max_epics: int = 5) -> str:
        """Create user prompt for epic consolidation."""
        return f"""Analyze the following requirements text and extract consolidated epics.

REQUIREMENTS TEXT:
{text_chunk}

Identify and consolidate similar requirements into unified epics. Focus on minimizing fragmentation and grouping related features. 
IMPORTANT: Create a maximum of {max_epics} epics total. Aggressively group similar features together.

Return ONLY valid JSON matching the consolidation schema."""

    def _create_epic_breakdown_user_prompt(self, epic_data: Dict[str, Any], original_text: str) -> str:
        """Create user prompt for breaking down an epic into detailed work items."""
        epic_title = epic_data.get('title', '')
        epic_description = epic_data.get('description', '')
        consolidated_requirements = epic_data.get('consolidated_requirements', [])
        
        requirements_text = "\n".join([f"- {req}" for req in consolidated_requirements])
        requirement_count = len(consolidated_requirements)
        
        subtask_instruction = ""
        if requirement_count >= 5:
            subtask_instruction = f"""
SUBTASK REQUIREMENT: This epic consolidates {requirement_count} requirements, so you MUST include subtasks for complex tasks. 
Break major tasks into 2-3 granular subtasks to ensure implementability."""
        
        return f"""Break down the following epic into detailed user stories, tasks, and subtasks.

EPIC TO BREAK DOWN:
Title: {epic_title}
Description: {epic_description}
Requirements Count: {requirement_count} consolidated requirements{subtask_instruction}

ORIGINAL REQUIREMENTS COVERED:
{requirements_text}

RELEVANT CONTEXT FROM ORIGINAL DOCUMENT:
{original_text[:2000]}...

Break this epic into actionable work items following the hierarchy rules. Include proper parent_reference for subtasks. Return ONLY valid JSON matching the breakdown schema."""

    def _create_system_prompt(self) -> str:
        """Create detailed system prompt to prevent hallucination (legacy method for compatibility)."""
        return """You are a professional business analyst tasked with parsing software requirements documents into structured work items.

CRITICAL INSTRUCTIONS:
1. ONLY extract information that is explicitly stated in the provided document.
2. DO NOT add features, assumptions, or interpretations beyond what is written.
3. DO NOT create work items for standard software practices unless explicitly mentioned.
4. If information is unclear or missing, use "TBD" or leave the field empty.
5. Maintain hierarchy exactly as stated:
   - Epic → Story → Task → Subtask.
   - If the document does not mention stories, tasks, or subtasks, stop at the highest available level.
6. Use exact wording from the document wherever possible.

WORK ITEM TYPES:
- Epic: Large feature spanning multiple stories (weeks/months).
- Story: User-facing functionality (days/weeks).
- Task: Technical implementation (hours/days).
- Subtask: Granular work within a task (hours).

PARSING RULES:
1. Look only for explicit functional requirements.
2. Group related functionality into logical epics.
3. Do not create tasks/stories unless they are explicitly written.
4. Acceptance criteria must be measurable and based on explicit text only.
5. If effort or time is not explicitly given, set estimated_hours = null.
6. Parent references must exactly match the title of the parent item.

OUTPUT FORMAT:
Return ONLY a valid JSON object in this exact structure:

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
- Do NOT output anything outside the JSON.
- Every parent_reference must match exactly or be null.
- If only epics are present, return only epics.
- Ensure JSON is valid and properly formatted.

REMEMBER: Quality over quantity. Return fewer, well-defined items rather than many vague ones.
"""

    def _create_user_prompt(self, text_chunk: str) -> str:
        """Create user prompt with the text to analyze (legacy method for compatibility)."""
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
            
            # Return empty work_items if AI couldn't extract anything useful
            if not validated_data.work_items:
                return {
                    'work_items': [],
                    'summary': 'No actionable work items found in this document section'
                }
            
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

    def _validate_epic_consolidation_response(self, response_text: str) -> Dict[str, Any]:
        """Validate and clean epic consolidation response."""
        try:
            cleaned_response = self._clean_json_response(response_text)
            parsed_data = json.loads(cleaned_response)
            
            # Handle various response structures
            if 'consolidated_epics' not in parsed_data:
                if 'epics' in parsed_data:
                    parsed_data['consolidated_epics'] = parsed_data['epics']
                    del parsed_data['epics']
                elif isinstance(parsed_data, list):
                    parsed_data = {
                        'consolidated_epics': parsed_data,
                        'summary': 'Epic consolidation completed'
                    }
                else:
                    raise ValueError("Response missing 'consolidated_epics' field")
            
            if 'summary' not in parsed_data:
                parsed_data['summary'] = 'Epic consolidation completed'
            
            # Truncate summary if too long to prevent validation errors
            if len(parsed_data['summary']) > 1000:
                parsed_data['summary'] = parsed_data['summary'][:997] + "..."
                print(f"📝 Summary truncated to fit 1000 character limit")
            
            # Validate with Pydantic
            validated_data = EpicConsolidationResult(**parsed_data)
            return validated_data.dict()
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Epic consolidation parse error: {str(e)}")
            print(f"Raw response: {response_text[:1000]}")
            raise ValueError(f"Invalid epic consolidation response: {str(e)}")

    def _validate_epic_breakdown_response(self, response_text: str) -> Dict[str, Any]:
        """Validate and clean epic breakdown response."""
        try:
            cleaned_response = self._clean_json_response(response_text)
            parsed_data = json.loads(cleaned_response)
            
            # Handle various response structures
            if 'work_items' not in parsed_data:
                if isinstance(parsed_data, list):
                    parsed_data = {
                        'work_items': self._normalize_work_items(parsed_data),
                        'epic_title': 'Unknown Epic',
                        'summary': 'Epic breakdown completed'
                    }
                else:
                    raise ValueError("Response missing 'work_items' field")
            else:
                parsed_data['work_items'] = self._normalize_work_items(parsed_data['work_items'])
            
            if 'epic_title' not in parsed_data:
                parsed_data['epic_title'] = 'Unknown Epic'
            if 'summary' not in parsed_data:
                parsed_data['summary'] = 'Epic breakdown completed'
            
            # Truncate summary if too long to prevent validation errors
            if len(parsed_data['summary']) > 1000:
                parsed_data['summary'] = parsed_data['summary'][:997] + "..."
                print(f"📝 Epic breakdown summary truncated to fit 1000 character limit")
            
            # Validate with Pydantic
            validated_data = EpicBreakdownResult(**parsed_data)
            return validated_data.dict()
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Epic breakdown parse error: {str(e)}")
            print(f"Raw response: {response_text[:1000]}")
            raise ValueError(f"Invalid epic breakdown response: {str(e)}")

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



    def _call_openrouter(self, user_prompt: str, system_prompt: str) -> str:
        """Call OpenRouter API with better models for structured output."""
        if not self.openrouter_available:
            raise Exception("OpenRouter API not configured")
        
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json"
        }
        
        for model_name in self.openrouter_models:
            print(f"🔍 Trying OpenRouter model: {model_name}")
            try:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
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
                    print(f"✅ OpenRouter {model_name} success: {response_text[:200]}...")
                    return response_text
                else:
                    error_msg = f"OpenRouter {model_name} HTTP {response.status_code}: {response.text}"
                    print(f"❌ {error_msg}")
                    
                    # If quota/rate limit, try next model
                    if response.status_code in [429, 403] or self._is_quota_exceeded(response.text):
                        print(f"🚫 Quota/rate limit for {model_name}, trying next")
                        continue
                    else:
                        print(f"🔄 Other error for {model_name}, trying next")
                        continue
                        
            except Exception as e:
                print(f"❌ OpenRouter {model_name} failed: {str(e)}")
                continue
        
        raise Exception("All OpenRouter models failed")

    def parse_requirements_chunk(self, text_chunk: str, chunk_index: int = 0) -> Dict[str, Any]:
        """Parse a chunk of requirements text into structured work items with intelligent fallback."""
        if not text_chunk.strip():
            raise ValueError("Empty text chunk provided")
        
        user_prompt = self._create_user_prompt(text_chunk)
        errors = []
        
        # Try Gemini models only
        if self.gemini_available:
            try:
                response = self._call_gemini(user_prompt)
                return self._validate_and_clean_response(response)
            except Exception as gemini_error:
                error_msg = str(gemini_error)
                print(f"Gemini failed for chunk {chunk_index}: {error_msg}")
                # Quota exceeded or other error
                if self._is_quota_exceeded(error_msg):
                    return {
                        'work_items': [],
                        'summary': 'Quota exceeded, no work items created. Please try again later.'
                    }
                else:
                    return {
                        'work_items': [],
                        'summary': f"No work items could be extracted from chunk {chunk_index + 1} - Gemini failed"
                    }
        # If Gemini is not available
        return {
            'work_items': [],
            'summary': 'No AI service available. Please check your configuration.'
        }

    def _call_ai_for_epic_consolidation(self, user_prompt: str) -> str:
        """Call AI services for epic consolidation with fallback."""
        errors = []
        
        # Try Gemini models only
        if self.gemini_available:
            print(f"🔍 Trying Gemini for epic consolidation...")
            try:
                if not self.gemini_available:
                    raise Exception("Gemini API not configured")
                full_prompt = f"{self._create_epic_consolidation_prompt()}\n\n{user_prompt}"
                for model_name in self.gemini_models:
                    print(f"🔍 Trying Gemini model: {model_name}")
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
                        print(f"✅ Gemini {model_name} success: {response.text[:200]}...")
                        return response.text
                    except Exception as e:
                        error_msg = str(e)
                        print(f"❌ Gemini {model_name} failed: {error_msg}")
                        if self._is_quota_exceeded(error_msg):
                            print(f"🚫 Quota exceeded detected for {model_name}")
                            return 'QUOTA_EXCEEDED'
                        else:
                            print(f"🔄 Non-quota error for {model_name}, trying next model")
                            continue
                print("❌ All Gemini models failed")
                raise Exception("All Gemini models failed")
            except Exception as gemini_error:
                error_msg = str(gemini_error)
                print(f"❌ Epic consolidation Gemini error: {error_msg}")
                if self._is_quota_exceeded(error_msg):
                    print("🚫 Quota exceeded in epic consolidation")
                    return 'QUOTA_EXCEEDED'
                else:
                    raise gemini_error
        print("❌ Gemini not available for epic consolidation")
        
        # Fallback to OpenRouter
        if self.openrouter_available:
            print("🔄 Falling back to OpenRouter for epic consolidation...")
            try:
                response = self._call_openrouter(user_prompt, self._create_epic_consolidation_prompt())
                if response == 'QUOTA_EXCEEDED':
                    print("🚫 OpenRouter quota exceeded")
                    return 'QUOTA_EXCEEDED'
                print("✅ OpenRouter epic consolidation success")
                return response
            except Exception as openrouter_error:
                error_msg = str(openrouter_error)
                print(f"❌ OpenRouter epic consolidation failed: {error_msg}")
                if self._is_quota_exceeded(error_msg):
                    return 'QUOTA_EXCEEDED'
                else:
                    print("🔄 OpenRouter failed, no more fallbacks")
        
        raise Exception("No AI service available. Please check your configuration.")

    def _call_ai_for_epic_breakdown(self, user_prompt: str) -> str:
        """Call AI services for epic breakdown with fallback."""
        errors = []
        
        # Try Gemini models only
        if self.gemini_available:
            try:
                full_prompt = f"{self._create_epic_breakdown_prompt()}\n\n{user_prompt}"
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
                        return response.text
                    except Exception as e:
                        if self._is_quota_exceeded(str(e)):
                            return 'QUOTA_EXCEEDED'
                        else:
                            continue
                raise Exception("All Gemini models failed")
            except Exception as gemini_error:
                if self._is_quota_exceeded(str(gemini_error)):
                    return 'QUOTA_EXCEEDED'
                else:
                    raise gemini_error
        
        # Fallback to OpenRouter
        if self.openrouter_available:
            print("🔄 Falling back to OpenRouter for epic breakdown...")
            try:
                response = self._call_openrouter(user_prompt, self._create_epic_breakdown_prompt())
                if response == 'QUOTA_EXCEEDED':
                    print("🚫 OpenRouter quota exceeded")
                    return 'QUOTA_EXCEEDED'
                print("✅ OpenRouter epic breakdown success")
                return response
            except Exception as openrouter_error:
                error_msg = str(openrouter_error)
                print(f"❌ OpenRouter epic breakdown failed: {error_msg}")
                if self._is_quota_exceeded(error_msg):
                    return 'QUOTA_EXCEEDED'
                else:
                    print("🔄 OpenRouter failed, no more fallbacks")
        
        raise Exception("No AI service available. Please check your configuration.")

    def consolidate_epics_from_text(self, text: str, max_epics: int = 5) -> Dict[str, Any]:
        """First pass: Extract and consolidate epics from requirements text."""
        if not text.strip():
            raise ValueError("Empty text provided")
        
        user_prompt = self._create_epic_consolidation_user_prompt(text, max_epics)
        
        try:
            response = self._call_ai_for_epic_consolidation(user_prompt)
            if response == 'QUOTA_EXCEEDED':
                return {
                    'consolidated_epics': [],
                    'summary': 'Quota exceeded, no work items created. Please try again later.'
                }
            return self._validate_epic_consolidation_response(response)
        except Exception as e:
            print(f"Epic consolidation failed: {str(e)}")
            # Return empty result instead of raising
            return {
                'consolidated_epics': [],
                'summary': f"Epic consolidation failed: {str(e)}"
            }

    def breakdown_epic_to_work_items(self, epic_data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """Second pass: Break down an epic into detailed work items."""
        if not epic_data:
            raise ValueError("Empty epic data provided")
        
        user_prompt = self._create_epic_breakdown_user_prompt(epic_data, original_text)
        
        try:
            response = self._call_ai_for_epic_breakdown(user_prompt)
            if response == 'QUOTA_EXCEEDED':
                return {
                    'work_items': [],
                    'epic_title': epic_data.get('title', 'Unknown Epic'),
                    'summary': 'Quota exceeded, no work items created. Please try again later.'
                }
            return self._validate_epic_breakdown_response(response)
        except Exception as e:
            print(f"Epic breakdown failed for epic '{epic_data.get('title', 'Unknown')}': {str(e)}")
            # Return empty result instead of raising
            return {
                'work_items': [],
                'epic_title': epic_data.get('title', 'Unknown Epic'),
                'summary': f"Epic breakdown failed: {str(e)}"
            }

    def parse_requirements_document_two_pass(self, text: str) -> List[Dict[str, Any]]:
        """Parse requirements document using two-pass approach: consolidate epics, then break them down."""
        if not text.strip():
            raise ValueError("Empty document provided")
        
        print("🎯 Starting two-pass AI parsing...")
        
        # Pass 1: Consolidate epics
        print("📋 Pass 1: Consolidating epics...")
        epic_consolidation_result = self.consolidate_epics_from_text(text)
        consolidated_epics = epic_consolidation_result.get('consolidated_epics', [])
        
        # Debug logging for epic consolidation result
        print(f"🔍 Epic consolidation result: {len(consolidated_epics)} epics found")
        print(f"🔍 Summary: {epic_consolidation_result.get('summary', 'No summary')}")
        
        if not consolidated_epics:
            print("⚠️ No epics consolidated, returning error result")
            error_summary = epic_consolidation_result.get('summary', 'Epic consolidation failed')
            print(f"🔍 Error details: {error_summary}")
            return [{
                'work_items': [],
                'summary': error_summary
            }]
        
        print(f"✅ Consolidated {len(consolidated_epics)} epics: {[epic['title'] for epic in consolidated_epics]}")
        
        # Pass 2: Break down each epic
        print("🔧 Pass 2: Breaking down epics into detailed work items...")
        all_results = []
        
        # First add the consolidated epics themselves
        epic_work_items = []
        for epic in consolidated_epics:
            epic_work_item = {
                'title': epic['title'],
                'description': epic['description'],
                'type': 'epic',
                'priority': epic.get('priority', 'medium'),
                'acceptance_criteria': epic.get('acceptance_criteria', []),
                'estimated_hours': None,
                'parent_reference': None
            }
            epic_work_items.append(epic_work_item)
        
        # Add epic result
        all_results.append({
            'work_items': epic_work_items,
            'summary': f"Consolidated {len(epic_work_items)} epics from requirements"
        })
        
        # Break down each epic
        for i, epic in enumerate(consolidated_epics):
            print(f"   🔨 Breaking down epic {i+1}/{len(consolidated_epics)}: '{epic['title']}'")
            breakdown_result = self.breakdown_epic_to_work_items(epic, text)
            
            if breakdown_result.get('work_items'):
                all_results.append(breakdown_result)
                print(f"      ✅ Generated {len(breakdown_result['work_items'])} work items")
            else:
                print(f"      ⚠️ No work items generated for this epic")
        
        print(f"🎉 Two-pass parsing completed: {len(all_results)} result sections")
        return all_results

    def parse_requirements_document_minimal(self, text: str) -> List[Dict[str, Any]]:
        """Parse requirements document with ultra-minimal approach - maximum 10 total work items."""
        if not text.strip():
            raise ValueError("Empty document provided")
        
        print("🎯 Starting ultra-minimal AI parsing (max 10 work items)...")
        
        # Use only 3 epics maximum for ultra-minimal approach
        epic_consolidation_result = self.consolidate_epics_from_text(text, max_epics=3)
        consolidated_epics = epic_consolidation_result.get('consolidated_epics', [])
        
        if not consolidated_epics:
            print("⚠️ No epics consolidated, creating single epic from text")
            # Create a single epic if consolidation fails
            consolidated_epics = [{
                'title': 'Project Implementation',
                'description': text[:200] + '...' if len(text) > 200 else text,
                'priority': 'high',
                'acceptance_criteria': ['Complete project requirements']
            }]
        
        # Limit to maximum 3 epics
        consolidated_epics = consolidated_epics[:3]
        print(f"✅ Using {len(consolidated_epics)} epics for minimal approach")
        
        all_results = []
        total_work_items = 0
        max_total_items = 10
        
        # Add the consolidated epics themselves (count towards total)
        epic_work_items = []
        for epic in consolidated_epics:
            if total_work_items >= max_total_items:
                break
            
            epic_work_item = {
                'title': epic['title'],
                'description': epic['description'],
                'type': 'epic',
                'priority': epic.get('priority', 'high'),
                'acceptance_criteria': epic.get('acceptance_criteria', []),
                'estimated_hours': None,
                'parent_reference': None
            }
            epic_work_items.append(epic_work_item)
            total_work_items += 1
        
        if epic_work_items:
            all_results.append({
                'work_items': epic_work_items,
                'summary': f"Ultra-minimal: {len(epic_work_items)} epics"
            })
        
        # Break down epics into very few work items
        remaining_items = max_total_items - total_work_items
        items_per_epic = max(1, remaining_items // len(consolidated_epics)) if consolidated_epics else 1
        
        for i, epic in enumerate(consolidated_epics):
            if total_work_items >= max_total_items:
                break
                
            print(f"   🔨 Minimal breakdown of epic {i+1}: '{epic['title']}' (max {items_per_epic} items)")
            
            # Get breakdown but limit items strictly
            breakdown_result = self.breakdown_epic_to_work_items(epic, text)
            
            if breakdown_result.get('work_items'):
                # Take only the most essential items
                limited_items = breakdown_result['work_items'][:items_per_epic]
                actual_items = []
                
                for item in limited_items:
                    if total_work_items >= max_total_items:
                        break
                    actual_items.append(item)
                    total_work_items += 1
                
                if actual_items:
                    all_results.append({
                        'work_items': actual_items,
                        'summary': f"Minimal breakdown: {len(actual_items)} essential items for '{epic['title']}'"
                    })
                    print(f"      ✅ Added {len(actual_items)} essential work items")
        
        print(f"🎉 Ultra-minimal parsing completed: {total_work_items} total work items (max {max_total_items})")
        return all_results

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
