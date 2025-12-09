from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from .models import TicketPriority, TicketStatus, TicketType, CommentType, NotificationType


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleRead(RoleBase):
    id: UUID

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    full_name: str
    email: str  # Changed from EmailStr to str to avoid email-validator dependency issue
    agency: Optional[str] = None  # Agence au lieu de département
    phone: Optional[str] = None


class UserCreate(UserBase):
    username: str
    password: str
    role_id: UUID


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    agency: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[UUID] = None
    status: Optional[str] = None
    specialization: Optional[str] = None


class UserRead(UserBase):
    id: UUID
    role: RoleRead
    status: str
    specialization: Optional[str] = None  # Spécialisation : "materiel" ou "applicatif"

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    new_password: Optional[str] = None  # Si None, génère un mot de passe aléatoire


class TicketBase(BaseModel):
    title: str
    description: str
    type: TicketType
    priority: TicketPriority


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    technician_id: Optional[UUID] = None
    resolution_summary: Optional[str] = None  # Résumé de la résolution


class TicketAssign(BaseModel):
    technician_id: UUID
    reason: Optional[str] = None
    notes: Optional[str] = None  # Notes/instructions pour le technicien


class TicketRead(TicketBase):
    id: UUID
    number: int
    status: TicketStatus
    created_at: datetime
    creator_id: UUID
    creator: Optional[UserRead] = None  # Informations complètes du créateur
    technician_id: Optional[UUID] = None
    technician: Optional[UserRead] = None  # Informations complètes du technicien
    secretary_id: Optional[UUID] = None
    user_agency: Optional[str] = None  # Agence de l'utilisateur créateur
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    type: CommentType = CommentType.TECHNIQUE
    ticket_id: UUID


class CommentRead(BaseModel):
    id: UUID
    ticket_id: UUID
    user_id: UUID
    content: str
    type: CommentType
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[UUID] = None


class TicketValidation(BaseModel):
    """Schéma pour la validation utilisateur d'un ticket résolu"""
    validated: bool  # True = valide (clôture), False = rejette (rejete)
    rejection_reason: Optional[str] = None  # Motif de rejet (obligatoire si validated=False)


class TicketFeedback(BaseModel):
    """Schéma pour le feedback/satisfaction utilisateur"""
    score: int  # 1-5
    comment: Optional[str] = None


class NotificationCreate(BaseModel):
    """Schéma pour créer une notification"""
    user_id: UUID
    type: NotificationType
    ticket_id: Optional[UUID] = None
    message: str


class NotificationRead(BaseModel):
    """Schéma pour lire une notification"""
    id: UUID
    user_id: UUID
    type: NotificationType
    ticket_id: Optional[UUID] = None
    message: str
    read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketHistoryRead(BaseModel):
    """Schéma pour lire l'historique d'un ticket"""
    id: UUID
    ticket_id: UUID
    old_status: Optional[str] = None
    new_status: str
    user_id: UUID
    reason: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True
