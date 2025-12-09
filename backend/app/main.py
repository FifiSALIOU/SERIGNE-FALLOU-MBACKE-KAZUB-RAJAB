from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, tickets, users, notifications, settings


def create_app() -> FastAPI:
    app = FastAPI(title="Système de gestion des tickets")

    # Configuration CORS pour permettre les requêtes depuis le frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Routers principaux
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
    app.include_router(settings.router, tags=["settings"])

    return app


app = create_app()


