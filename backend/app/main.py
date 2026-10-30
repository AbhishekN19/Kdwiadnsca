from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.routes import router as api_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Real-time and historical monitoring and quantitative accuracy evaluation of UK National Grid wind generation forecasts from Elexon BMRS.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "title": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "apiEndpoints": [
            "/api/health",
            "/api/dates",
            "/api/summary",
            "/api/comparison",
            "/api/daily-accuracy",
            "/api/intraday-profile",
            "/api/forecast-evolution",
        ],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.host, port=settings.port, reload=True)
