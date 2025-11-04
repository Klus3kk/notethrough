from fastapi import APIRouter

from .routes import health, ranking

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["meta"])
api_router.include_router(ranking.router, prefix="/ranking", tags=["ranking"])
