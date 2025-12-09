"""
Router pour la gestion des paramètres système, notamment la configuration email
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from .. import models
from ..database import get_db
from ..security import get_current_user, require_role
from ..email_service import email_service

router = APIRouter(prefix="/settings", tags=["settings"])


class EmailSettingsUpdate(BaseModel):
    """Schéma pour mettre à jour les paramètres email"""
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: Optional[EmailStr] = None
    sender_name: Optional[str] = None
    use_tls: Optional[bool] = None
    verify_ssl: Optional[bool] = None
    email_enabled: Optional[bool] = None


class EmailSettingsRead(BaseModel):
    """Schéma pour lire les paramètres email"""
    smtp_server: str
    smtp_port: int
    smtp_username: str
    sender_email: str
    sender_name: str
    use_tls: bool
    verify_ssl: bool
    email_enabled: bool

    class Config:
        from_attributes = True


@router.get("/email", response_model=EmailSettingsRead)
def get_email_settings(
    current_user: models.User = Depends(
        require_role("DSI", "Admin")
    ),
):
    """Récupérer les paramètres email actuels"""
    return EmailSettingsRead(
        smtp_server=email_service.smtp_server,
        smtp_port=email_service.smtp_port,
        smtp_username=email_service.smtp_username or "",
        sender_email=email_service.sender_email,
        sender_name=email_service.sender_name,
        use_tls=email_service.use_tls,
        verify_ssl=email_service.verify_ssl,
        email_enabled=email_service.email_enabled
    )


@router.put("/email", response_model=EmailSettingsRead)
def update_email_settings(
    settings: EmailSettingsUpdate,
    current_user: models.User = Depends(
        require_role("DSI", "Admin")
    ),
):
    """Mettre à jour les paramètres email"""
    # Mettre à jour les paramètres du service email
    if settings.smtp_server is not None:
        email_service.smtp_server = settings.smtp_server
    if settings.smtp_port is not None:
        email_service.smtp_port = settings.smtp_port
    if settings.smtp_username is not None:
        email_service.smtp_username = settings.smtp_username
    if settings.smtp_password is not None:
        email_service.smtp_password = settings.smtp_password
    if settings.sender_email is not None:
        email_service.sender_email = settings.sender_email
    if settings.sender_name is not None:
        email_service.sender_name = settings.sender_name
    if settings.use_tls is not None:
        email_service.use_tls = settings.use_tls
    if settings.verify_ssl is not None:
        email_service.verify_ssl = settings.verify_ssl
    if settings.email_enabled is not None:
        email_service.email_enabled = settings.email_enabled
    
    # Note: Dans un environnement de production, vous devriez sauvegarder
    # ces paramètres dans la base de données ou un fichier de configuration
    # sécurisé plutôt que dans la mémoire
    
    return EmailSettingsRead(
        smtp_server=email_service.smtp_server,
        smtp_port=email_service.smtp_port,
        smtp_username=email_service.smtp_username or "",
        sender_email=email_service.sender_email,
        sender_name=email_service.sender_name,
        use_tls=email_service.use_tls,
        verify_ssl=email_service.verify_ssl,
        email_enabled=email_service.email_enabled
    )


@router.post("/email/test")
def test_email_configuration(
    test_email: EmailStr,
    current_user: models.User = Depends(
        require_role("DSI", "Admin")
    ),
):
    """Tester la configuration email en envoyant un email de test"""
    subject = "Test de configuration email - Système de Gestion des Tickets"
    body = f"""
Bonjour,

Ceci est un email de test pour vérifier la configuration SMTP.

Si vous recevez cet email, cela signifie que la configuration est correcte.

Cordialement,
{email_service.sender_name}
"""
    
    success = email_service.send_email(
        to_emails=[test_email],
        subject=subject,
        body=body
    )
    
    if success:
        return {"success": True, "message": f"Email de test envoyé avec succès à {test_email}"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'envoi de l'email de test. Vérifiez les paramètres SMTP."
        )

