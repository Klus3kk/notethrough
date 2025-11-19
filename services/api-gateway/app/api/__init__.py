from fastapi import APIRouter

from .routes import auth, health, tracks


api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(tracks.router, prefix="/tracks", tags=["tracks"])
api_router.include_router(auth.router)
