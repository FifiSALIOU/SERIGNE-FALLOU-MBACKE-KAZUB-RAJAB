from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .routers import auth, tickets, users, notifications, settings
from .scheduler import run_scheduled_tasks


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

    # Configurer le scheduler pour exécuter les tâches planifiées
    scheduler = BackgroundScheduler()
    # Exécuter toutes les heures
    scheduler.add_job(
        run_scheduled_tasks,
        trigger=CronTrigger(minute=0),  # Toutes les heures à la minute 0
        id='run_scheduled_tasks',
        name='Exécuter les tâches planifiées (rappels et clôtures)',
        replace_existing=True
    )
    scheduler.start()

    return app


app = create_app()


