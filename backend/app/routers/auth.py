from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,
)

router = APIRouter()


@router.post("/register", response_model=schemas.UserRead)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.User)
        .filter(
            (models.User.email == user_in.email)
            | (models.User.username == user_in.username)
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with same email or username already exists",
        )

    db_user = models.User(
        full_name=user_in.full_name,
        email=user_in.email,
        agency=user_in.agency,
        phone=user_in.phone,
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role_id=user_in.role_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return schemas.Token(access_token=access_token)


@router.get("/me", response_model=schemas.UserRead)
def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Récupère les informations de l'utilisateur connecté"""
    # S'assurer que le rôle est chargé
    if current_user.role_id:
        current_user.role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    return current_user


@router.get("/roles", response_model=List[schemas.RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Liste tous les rôles disponibles"""
    roles = db.query(models.Role).all()
    return roles


