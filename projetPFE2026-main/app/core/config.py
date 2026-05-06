from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str

    JWT_SECRET_KEY: str = "change_me_123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    SEED_ADMIN_ENABLED: bool = True
    SEED_ADMIN_EMAIL: str = "admin@mz.com"
    SEED_ADMIN_NAME: str = "Admin MZ"
    SEED_ADMIN_PASSWORD: str = "admin12345"

    # Email Configuration
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_STARTTLS: bool
    MAIL_SSL_TLS: bool
    GOOGLE_MAPS_API_KEY: str = ""


settings = Settings()
