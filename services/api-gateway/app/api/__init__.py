from fastapi import APIRouter

from .routes import health, tracks


api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(tracks.router, prefix="/tracks", tags=["tracks"])
