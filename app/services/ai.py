import json
import re
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, ValidationError
import google.generativeai as genai
from openai import OpenAI
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
    work_items: List[WorkItemCreate] = Field(..., min_items=1, description="List of parsed work items")
    summary: str = Field(..., min_length=50, max_length=500, description="Brief summary of requirements")


class AIParser:
    def __init__(self):
        # Initialize Gemini
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
        else:
            self.gemini_model = None
        
        # Initialize OpenAI as fallback
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

OUTPUT FORMAT: Return valid JSON matching the ParsedRequirements schema exactly.

VALIDATION REQUIREMENTS:
- Each work item must have a clear, descriptive title (5-200 chars)
- Descriptions must be detailed and specific (10-2000 chars)
- Type must be exactly: "epic", "story", "task", or "subtask"
- Priority must be exactly: "low", "medium", "high", or "critical"
- Parent references must match exact titles of parent items
- Acceptance criteria should be measurable and testable

Remember: Quality over quantity. It's better to create fewer, well-defined work items than many vague ones."""

    def _create_user_prompt(self, text_chunk: str) -> str:
        """Create user prompt with the text to analyze."""
        return f"""Analyze the following requirements text and extract work items according to the system instructions.

REQUIREMENTS TEXT:
{text_chunk}

Parse this text into structured work items. Return ONLY valid JSON matching the ParsedRequirements schema. Do not include any explanatory text outside the JSON."""

    def _validate_and_clean_response(self, response_text: str) -> Dict[str, Any]:
        """Validate and clean the LLM response."""
        try:
            # Extract JSON from response (handle cases where LLM adds extra text)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
            else:
                json_str = response_text
            
            # Parse JSON
            parsed_data = json.loads(json_str)
            
            # Validate with Pydantic
            validated_data = ParsedRequirements(**parsed_data)
            
            return validated_data.dict()
        
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"Invalid response format: {str(e)}")

    def _call_gemini(self, user_prompt: str) -> str:
        """Call Gemini API."""
        if not self.gemini_model:
            raise Exception("Gemini API not configured")
        
        try:
            # Create the full prompt
            full_prompt = f"{self._create_system_prompt()}\n\n{user_prompt}"
            
            response = self.gemini_model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistent output
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=4000,
                )
            )
            
            return response.text
        
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")

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
        """Parse a chunk of requirements text into structured work items."""
        if not text_chunk.strip():
            raise ValueError("Empty text chunk provided")
        
        user_prompt = self._create_user_prompt(text_chunk)
        
        # Try Gemini first
        try:
            if self.gemini_model:
                response = self._call_gemini(user_prompt)
                return self._validate_and_clean_response(response)
        except Exception as gemini_error:
            print(f"Gemini failed for chunk {chunk_index}: {gemini_error}")
            
            # Fallback to OpenAI
            try:
                if self.openai_client:
                    response = self._call_openai(user_prompt)
                    return self._validate_and_clean_response(response)
            except Exception as openai_error:
                print(f"OpenAI fallback failed for chunk {chunk_index}: {openai_error}")
                raise Exception(f"Both AI services failed. Gemini: {gemini_error}, OpenAI: {openai_error}")
        
        raise Exception("No AI service configured")

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
