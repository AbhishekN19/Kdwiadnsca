import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

class Settings(BaseModel):
    app_name: str = "UK Wind Generation Forecast Monitor & Accuracy Platform"
    app_version: str = "1.0.0"
    elexon_base_url: str = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    
    # Target analysis window
    default_date_from: str = "2026-01-01"
    default_date_to: str = "2026-01-31"
    
    # Day-Ahead Auction Cutoff presets (UTC)
    default_cutoff_mode: str = "d_minus_1_1200"
    
    # Data paths
    seed_actuals_path: Path = DATA_DIR / "seed_jan_2026_actuals.json"
    seed_forecasts_path: Path = DATA_DIR / "seed_jan_2026_forecasts.json"

    # Server settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

settings = Settings()
