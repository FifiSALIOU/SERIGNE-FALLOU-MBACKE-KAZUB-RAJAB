from typing import List
from uuid import UUID
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user, require_role, get_password_hash

router = APIRouter()


class TechnicianWithWorkload(schemas.UserRead):
    """Schéma étendu pour inclure la charge de travail"""
    assigned_tickets_count: int = 0
    in_progress_tickets_count: int = 0

    class Config:
        from_attributes = True


@router.get("/technicians", response_model=List[schemas.UserRead])
def list_technicians(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role("Secrétaire DSI", "Adjoint DSI", "DSI", "Admin")
    ),
):
    """Liste tous les techniciens avec leur charge de travail pour l'assignation de tickets"""
    technician_role = db.query(models.Role).filter(models.Role.name == "Technicien").first()
    if not technician_role:
        return []
    
    technicians = (
        db.query(models.User)
        .filter(
            models.User.role_id == technician_role.id,
            models.User.status == "actif"
        )
        .all()
    )
    
    # Ajouter la charge de travail pour chaque technicien
    result = []
    for tech in technicians:
        assigned_count = (
            db.query(models.Ticket)
            .filter(
                models.Ticket.technician_id == tech.id,
                models.Ticket.status.in_([
                    models.TicketStatus.ASSIGNE_TECHNICIEN,
                    models.TicketStatus.EN_COURS
                ])
            )
            .count()
        )
        in_progress_count = (
            db.query(models.Ticket)
            .filter(
                models.Ticket.technician_id == tech.id,
                models.Ticket.status == models.TicketStatus.EN_COURS
            )
            .count()
        )
        
        tech_dict = {
            "id": tech.id,
            "full_name": tech.full_name,
            "email": tech.email,
            "agency": tech.agency,
            "phone": tech.phone,
            "role": {
                "id": tech.role.id,
                "name": tech.role.name,
                "description": tech.role.description
            },
            "status": tech.status,
            "specialization": tech.specialization,
            "assigned_tickets_count": assigned_count,
            "in_progress_tickets_count": in_progress_count
        }
        result.append(tech_dict)
    
    return result


@router.get("/", response_model=List[schemas.UserRead])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("DSI", "Admin")),
):
    """Liste tous les utilisateurs (Admin uniquement)"""
    users = db.query(models.User).all()
    
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "agency": user.agency,
            "phone": user.phone,
            "role": {
                "id": user.role.id,
                "name": user.role.name,
                "description": user.role.description
            },
            "status": user.status,
            "specialization": user.specialization,
            "is_active": user.status == "actif" if hasattr(user, "status") else True
        }
        result.append(user_dict)
    
    return result


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("DSI", "Admin")),
):
    """Récupérer un utilisateur par son ID"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: UUID,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("DSI", "Admin")),
):
    """Modifier un utilisateur"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Vérifier si l'email est déjà utilisé par un autre utilisateur
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
    
    # Mettre à jour les champs fournis
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.agency is not None:
        user.agency = user_update.agency
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.status is not None:
        user.status = user_update.status
    if user_update.specialization is not None:
        user.specialization = user_update.specialization
    if user_update.role_id is not None:
        # Vérifier que le rôle existe
        role = db.query(models.Role).filter(models.Role.id == user_update.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        user.role_id = user_update.role_id
    
    db.commit()
    db.refresh(user)
    
    # Charger le rôle pour la réponse
    user.role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
    
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("DSI", "Admin")),
):
    """Supprimer un utilisateur"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Ne pas permettre la suppression de soi-même
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Vérifier si l'utilisateur a des tickets créés ou assignés
    created_tickets = db.query(models.Ticket).filter(models.Ticket.creator_id == user_id).count()
    assigned_tickets = db.query(models.Ticket).filter(models.Ticket.technician_id == user_id).count()
    
    if created_tickets > 0 or assigned_tickets > 0:
        # Au lieu de supprimer, désactiver l'utilisateur
        user.status = "inactif"
        db.commit()
        return {"message": "User deactivated (has associated tickets)", "user_id": str(user_id)}
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully", "user_id": str(user_id)}


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: UUID,
    password_reset: schemas.PasswordReset,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("DSI", "Admin")),
):
    """Réinitialiser le mot de passe d'un utilisateur"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Générer un mot de passe aléatoire si non fourni
    if password_reset.new_password:
        new_password = password_reset.new_password
    else:
        # Générer un mot de passe aléatoire de 12 caractères
        alphabet = string.ascii_letters + string.digits
        new_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    # Hasher et sauvegarder le nouveau mot de passe
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {
        "message": "Password reset successfully",
        "user_id": str(user_id),
        "new_password": new_password  # Retourner le mot de passe pour l'affichage (à ne faire qu'en développement)
    }

