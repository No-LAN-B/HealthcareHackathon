from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import CareThreadEntry, Doctor, Patient
from schemas import CareThreadEntryOut, PatientOut

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db)):
    return db.scalars(select(Patient).order_by(Patient.name)).all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/thread", response_model=list[CareThreadEntryOut])
def get_patient_thread(patient_id: int, db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    entries = db.scalars(
        select(CareThreadEntry)
        .where(CareThreadEntry.patient_id == patient_id)
        .order_by(CareThreadEntry.created_at.asc())
    ).all()
    result = []
    for entry in entries:
        doctor = db.get(Doctor, entry.doctor_id)
        result.append(CareThreadEntryOut(
            id=entry.id,
            patient_id=entry.patient_id,
            referral_id=entry.referral_id,
            doctor_id=entry.doctor_id,
            entry_type=entry.entry_type,
            content=entry.content,
            created_at=entry.created_at,
            doctor_name=doctor.name if doctor else None,
        ))
    return result
