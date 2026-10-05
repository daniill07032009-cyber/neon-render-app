from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Северная Библиотека"
    PORT: int = 8000
    ENV: str = "development"
    SECRET_KEY: str

    DATABASE_URL: str = "sqlite:///./library.db"

    SESSION_COOKIE_NAME: str = "sl_session"
    SESSION_MAX_AGE: int = 60 * 60 * 24 * 30

    UPLOAD_DIR: str = "./uploads"
    UPLOAD_URL_PREFIX: str = "/uploads"


settings = Settings()