import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class LLMProfile:
    def __init__(self, id: str, name: str, type: str, api_key: str, base_url: str, model: str, is_active: bool = False):
        self.id = id
        self.name = name
        self.type = type # 'openai' | 'openrouter' | 'gemini' | 'ollama' | 'custom'
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.is_active = is_active

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "model": self.model,
            "is_active": self.is_active
        }

class SettingsManager:
    def __init__(self):
        self.profiles_path = settings.get_data_dir() / "settings.json"
        self.profiles: List[LLMProfile] = []
        self.mecaprof_settings: Dict[str, Any] = {
            "profile_id": "",
            "model": "",
            "system_prompt": "Tu es un professeur virtuel intégré à un cours. Ton but est d'éclaircir un point précis posé par l'élève. Utilise un ton pédagogique, concis et direct. Ne génère pas un nouveau cours. Fournis une explication courte (max 3 paragraphes) ou un exemple simple. Réponds en Markdown.",
            "temperature": 0.3
        }
        self._last_mtime = 0
        self.load_profiles()

    def check_and_reload(self):
        if self.profiles_path.exists():
            try:
                current_mtime = self.profiles_path.stat().st_mtime
                if not hasattr(self, "_last_mtime") or current_mtime != self._last_mtime:
                    logger.info("settings.json modification or mount update detected. Reloading profiles from disk...")
                    self.load_profiles()
            except Exception as e:
                logger.error(f"Error checking/reloading settings.json: {e}")

    def load_profiles(self):
        if self.profiles_path.exists():
            try:
                self._last_mtime = self.profiles_path.stat().st_mtime
                with open(self.profiles_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.profiles = [
                        LLMProfile(
                            id=p["id"],
                            name=p["name"],
                            type=p["type"],
                            api_key=p["api_key"],
                            base_url=p.get("base_url", ""),
                            model=p.get("model", ""),
                            is_active=p.get("is_active", False)
                        )
                        for p in data.get("profiles", [])
                    ]
                    if "mecaprof" in data:
                        self.mecaprof_settings.update(data["mecaprof"])
                logger.info(f"Loaded {len(self.profiles)} LLM profiles from settings.json")
            except PermissionError as pe:
                logger.error(f"Permission denied when loading settings.json at {self.profiles_path}: {pe}. Please check filesystem permissions (e.g. chmod 666 settings.json).")
                self.create_default_profiles()
            except Exception as e:
                logger.error(f"Error loading settings.json: {e}")
                self.create_default_profiles()
        else:
            logger.warning(f"settings.json not found at {self.profiles_path}. Creating default profiles.")
            self.create_default_profiles()

    def create_default_profiles(self):
        # Load from config .env values as fallback
        self.profiles = [
            LLMProfile(
                id="default_openai",
                name="OpenAI (Par défaut)",
                type="openai",
                api_key=settings.LLM_API_KEY or "",
                base_url=settings.LLM_BASE_URL or "https://api.openai.com/v1",
                model=settings.LLM_MODEL or "gpt-4o-mini",
                is_active=True
            ),
            LLMProfile(
                id="preset_openrouter",
                name="OpenRouter (Llama 3.1)",
                type="openrouter",
                api_key="",
                base_url="https://openrouter.ai/api/v1",
                model="nousresearch/hermes-3-llama-3.1-405b:free",
                is_active=False
            ),
            LLMProfile(
                id="preset_gemini",
                name="Google Gemini (Flash Raw)",
                type="gemini",
                api_key="",
                base_url="https://generativelanguage.googleapis.com/v1beta",
                model="gemini-flash-latest",
                is_active=False
            )
        ]
        self.save_profiles()

    def save_profiles(self):
        try:
            with open(self.profiles_path, "w", encoding="utf-8") as f:
                json.dump({
                    "profiles": [p.to_dict() for p in self.profiles],
                    "mecaprof": self.mecaprof_settings
                }, f, indent=2, ensure_ascii=False)
            # Update _last_mtime after saving to prevent immediate reload
            if self.profiles_path.exists():
                self._last_mtime = self.profiles_path.stat().st_mtime
            logger.info("Saved LLM profiles to settings.json")
        except PermissionError as pe:
            logger.error(f"Permission denied when saving settings.json at {self.profiles_path}: {pe}. Please check filesystem permissions (e.g. chmod 666 settings.json).")
        except Exception as e:
            logger.error(f"Error saving settings.json: {e}")

    def get_active_profile(self) -> LLMProfile:
        self.check_and_reload()
        for p in self.profiles:
            if p.is_active:
                return p
        # Fallback to first profile
        if self.profiles:
            self.profiles[0].is_active = True
            return self.profiles[0]
        # Return fallback empty profile
        return LLMProfile("fallback", "Fallback", "openai", "", "", "")

    def set_active_profile(self, profile_id: str):
        self.check_and_reload()
        found = False
        for p in self.profiles:
            if p.id == profile_id:
                p.is_active = True
                found = True
            else:
                p.is_active = False
        if found:
            self.save_profiles()
            
    def add_profile(self, name: str, type: str, api_key: str, base_url: str, model: str) -> LLMProfile:
        self.check_and_reload()
        import uuid
        profile_id = f"profile_{str(uuid.uuid4())[:8]}"
        new_profile = LLMProfile(
            id=profile_id,
            name=name,
            type=type,
            api_key=api_key,
            base_url=base_url,
            model=model,
            is_active=False
        )
        self.profiles.append(new_profile)
        self.save_profiles()
        return new_profile

    def update_profile(self, profile_id: str, name: str, type: str, api_key: str, base_url: str, model: str):
        self.check_and_reload()
        for p in self.profiles:
            if p.id == profile_id:
                p.name = name
                p.type = type
                p.api_key = api_key
                p.base_url = base_url
                p.model = model
                break
        self.save_profiles()

    def delete_profile(self, profile_id: str):
        self.check_and_reload()
        # Prevent deleting the active profile without selecting another
        active_deleted = False
        for p in self.profiles:
            if p.id == profile_id and p.is_active:
                active_deleted = True
                
        self.profiles = [p for p in self.profiles if p.id != profile_id]
        
        if active_deleted and self.profiles:
            self.profiles[0].is_active = True
            
        self.save_profiles()

# Global settings manager instance
settings_manager = SettingsManager()
