from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .config import get_settings
from .services.ml_client import close_client as close_ml_client
from .cache import close_client as close_cache_client


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        try:
            yield
        finally:
            await close_ml_client()
            await close_cache_client()

    app = FastAPI(
        title=settings.app_name,
        version="0.4.2",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/", tags=["meta"], summary="API metadata")
    async def root() -> dict[str, str]:
        return {"message": f"{settings.app_name} (env={settings.environment})"}

    return app


app = create_app()
