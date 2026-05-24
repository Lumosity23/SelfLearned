import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # LLM Settings
    LLM_API_KEY: str = Field(default="", description="OpenAI or compatible API Key")
    LLM_BASE_URL: str = Field(default="https://api.openai.com/v1", description="Base URL for OpenAI or compatible API (e.g. Ollama, Gemini compatibility)")
    LLM_MODEL: str = Field(default="gpt-4o-mini", description="Model name to use (e.g., gpt-4o-mini, gemini-2.5-flash, llama3, etc.)")
    
    # Storage Settings
    DATA_DIR: str = Field(default="", description="Directory where courses are stored")

    # Cors Settings
    CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_data_dir(self) -> Path:
        """
        Returns the data directory. Resolves to a fallback if DATA_DIR is not set or not writable.
        """
        if self.DATA_DIR:
            path = Path(self.DATA_DIR).resolve()
        else:
            # If running in docker, /SelfLearned_Data should exist. If not, default to user's home or project root.
            docker_path = Path("/SelfLearned_Data")
            try:
                # Check if we can write to /SelfLearned_Data or create it
                if docker_path.exists():
                    path = docker_path
                else:
                    # Let's try creating it
                    docker_path.mkdir(parents=True, exist_ok=True)
                    path = docker_path
            except (PermissionError, IOError):
                # Fallback to home directory or project directory
                home_dir = Path.home() / "SelfLearned_Data"
                path = home_dir

        # Ensure directory exists
        path.mkdir(parents=True, exist_ok=True)
        return path

# Global settings instance
settings = Settings()
