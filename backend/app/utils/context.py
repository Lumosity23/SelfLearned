import datetime
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

class ContextOptimizer:
    def __init__(self, provider: str, model_name: str, api_key: str = None):
        self.provider = provider.lower()
        self.model_name = model_name
        self.api_key = api_key
        
        # Initialize Google GenAI client if provider is google and SDK is available
        self.google_client = None
        if (self.provider == "google" or self.provider == "gemini") and self.api_key and genai:
            try:
                self.google_client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize google-genai Client: {e}")

    def optimize_history(self, history: List[Dict[str, Any]], current_prompt: str) -> Dict[str, Any]:
        """
        Takes the complete conversation history and the current prompt, applies the
        best provider-specific strategy (Context Caching for Gemini, Sliding Window for fallbacks),
        and returns optimized arguments ready for LLM API calls.
        """
        # Google Gemini: Use native Context Caching if SDK is available
        if (self.provider == "google" or self.provider == "gemini") and self.google_client:
            return self._apply_google_cache(history, current_prompt)
        
        # Global fallback (OpenRouter, OpenAI, Ollama, Bedrock, etc.): Sliding Window
        return self._apply_global_fallback(history, current_prompt)

    def _apply_google_cache(self, history: List[Dict[str, Any]], current_prompt: str) -> Dict[str, Any]:
        """
        STRATEGY GEMINI: Creates or references a server-side context cache on Google's infrastructure.
        """
        # Convert history to Google GenAI official SDK content formats
        google_contents = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            google_contents.append(
                types.Content(role=role, parts=[types.Part.from_text(msg.get("content", ""))])
            )

        # Google requires a minimum of ~32k tokens to enable context caching.
        # If the history is short (e.g. less than 15 messages), we avoid creating a cache and send raw list.
        if len(history) < 15:
            return {"contents": google_contents + [types.Content(role="user", parts=[types.Part.from_text(current_prompt)])]}

        try:
            logger.info(f"Creating a context cache on Gemini for model {self.model_name}...")
            # Create context cache with a 1-hour TTL
            cache = self.google_client.caches.create(
                model=self.model_name,
                config=types.CreateCachedContentConfig(
                    contents=google_contents,
                    ttl=datetime.timedelta(hours=1)
                )
            )
            logger.info(f"Successfully created context cache: {cache.name}")
            return {
                "contents": current_prompt,
                "config": types.GenerateContentConfig(cached_content=cache.name)
            }
        except Exception as e:
            logger.error(f"Error creating Google context cache, falling back to standard list: {e}")
            return {"contents": google_contents + [types.Content(role="user", parts=[types.Part.from_text(current_prompt)])]}

    def _apply_global_fallback(self, history: List[Dict[str, Any]], current_prompt: str) -> Dict[str, Any]:
        """
        STRATEGY FALLBACK: Strict sliding window. Keeps only the latest 10 messages.
        Prepends a system flag if truncation happens so the model is aware of the context pruning.
        """
        MAX_MESSAGES = 10
        
        if len(history) <= MAX_MESSAGES:
            optimized_history = list(history)
        else:
            logger.info(f"Pruning conversation history from {len(history)} to {MAX_MESSAGES} messages.")
            # Slice the history to keep only the latest 10 messages
            optimized_history = list(history[-MAX_MESSAGES:])
            # Prepend context truncation indicator
            optimized_history.insert(0, {
                "role": "system",
                "content": "[Context Truncated for token optimization. Keep following the conversation flow.]"
            })

        # Append current user prompt as the final message
        payload = list(optimized_history)
        payload.append({"role": "user", "content": current_prompt})
        
        return {"messages": payload}
