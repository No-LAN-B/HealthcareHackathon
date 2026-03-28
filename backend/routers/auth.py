from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Doctor
from schemas import LoginRequest, LoginResponse

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    doctor = db.scalars(
        select(Doctor).where(Doctor.name == body.username)
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return LoginResponse(
        doctor_id=doctor.id,
        name=doctor.name,
        role=doctor.role,
        specialty=doctor.specialty,
    )
