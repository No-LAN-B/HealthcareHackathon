"""Seed the database with mock data for MedRelay demo.

Loads 2000 real patients from patients.csv and adds demo-critical patients
with stable IDs so the frontend schedule references work.
"""

import csv
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

from database import Base, engine, SessionLocal
from models import Doctor, Patient, Referral, CareThreadEntry

CSV_PATH = Path(__file__).parent / "patients.csv"


def _generate_email(first: str, last: str) -> str:
    """Generate a plausible email from patient names."""
    return f"{first.lower().replace(' ', '')}.{last.lower().replace(' ', '')}@email.ca"


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Idempotent: skip if data exists
    if db.query(Doctor).first():
        print("Database already seeded, skipping.")
        db.close()
        return

    # --- Doctors ---
    referring_doctors = [
        Doctor(name="Dr. Sarah Chen", email="sarah.chen@telushealth.ca", role="referring", specialty=None, password_plain="password"),
        Doctor(name="Dr. James Okafor", email="james.okafor@virtualurgent.ca", role="referring", specialty=None, password_plain="password"),
        Doctor(name="Dr. Priya Nair", email="priya.nair@remoteclinic.ca", role="referring", specialty=None, password_plain="password"),
    ]
    specialist_doctors = [
        Doctor(name="Dr. Marcus Webb", email="marcus.webb@psych.ca", role="specialist", specialty="psychiatrist", password_plain="password"),
        Doctor(name="Dr. Alicia Torres", email="alicia.torres@cardio.ca", role="specialist", specialty="cardiologist", password_plain="password"),
        Doctor(name="Dr. David Kim", email="david.kim@ortho.ca", role="specialist", specialty="orthopedic_surgeon", password_plain="password"),
    ]
    all_doctors = referring_doctors + specialist_doctors
    db.add_all(all_doctors)
    db.flush()

    dr_chen = referring_doctors[0]
    dr_okafor = referring_doctors[1]
    dr_nair = referring_doctors[2]
    dr_webb = specialist_doctors[0]
    dr_torres = specialist_doctors[1]
    dr_kim = specialist_doctors[2]

    # --- Demo-critical patients (IDs 1-12, referenced by frontend schedule) ---
    demo_patients = [
        Patient(health_card_id="1234-567-890-01", name="Marcus Bellamy", email="marcus.bellamy@email.ca", date_of_birth="1988-03-14"),
        Patient(health_card_id="2345-678-901-02", name="Anika Sharma", email="anika.sharma@email.ca", date_of_birth="1975-07-22"),
        Patient(health_card_id="3456-789-012-03", name="Jean-Luc Tremblay", email="jl.tremblay@email.ca", date_of_birth="1962-11-05"),
        Patient(health_card_id="4567-890-123-04", name="Fatima Al-Hassan", email="fatima.alhassan@email.ca", date_of_birth="1990-01-18"),
        Patient(health_card_id="5678-901-234-05", name="Connor MacLeod", email="connor.macleod@email.ca", date_of_birth="1983-09-30"),
        Patient(health_card_id="6789-012-345-06", name="Mei-Lin Wong", email="meilin.wong@email.ca", date_of_birth="1995-04-12"),
        Patient(health_card_id="7890-123-456-07", name="David Osei", email="david.osei@email.ca", date_of_birth="1970-06-25"),
        Patient(health_card_id="8901-234-567-08", name="Sophie Lavoie", email="sophie.lavoie@email.ca", date_of_birth="2001-12-03"),
        Patient(health_card_id="9012-345-678-09", name="Raj Patel", email="raj.patel@email.ca", date_of_birth="1958-08-19"),
        Patient(health_card_id="0123-456-789-10", name="Elena Vasquez", email="elena.vasquez@email.ca", date_of_birth="1992-02-28"),
        Patient(health_card_id="1122-334-455-11", name="Tyler Chicken", email="tyler.chicken@email.ca", date_of_birth="1985-05-16"),
        Patient(health_card_id="2233-445-566-12", name="Chloe Beaumont", email="chloe.beaumont@email.ca", date_of_birth="1998-10-07"),
    ]
    db.add_all(demo_patients)
    db.flush()
    # demo_patients[0].id == 1 (Marcus Bellamy), etc.
    patients = demo_patients

    # --- Bulk-load patients from CSV ---
    if CSV_PATH.exists():
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            csv_patients = []
            for row in reader:
                name = f"{row['first_name']} {row['last_name']}"
                csv_patients.append(Patient(
                    health_card_id=row["insurance_number"],
                    name=name,
                    email=_generate_email(row["first_name"], row["last_name"]),
                    date_of_birth=row["date_of_birth"],
                ))
            db.add_all(csv_patients)
            db.flush()
            print(f"Loaded {len(csv_patients)} patients from CSV")
    else:
        print(f"Warning: {CSV_PATH} not found — using demo patients only")

    now = datetime.now(timezone.utc)

    # --- Pre-seeded referrals ---

    # Referral 1: Anika Sharma -> psychiatrist (pending, 20 days old, urgency 6 = OVERDUE flag)
    ref1 = Referral(
        patient_id=patients[1].id,
        referring_doctor_id=dr_okafor.id,
        specialist_type="psychiatrist",
        urgency=6,
        clinical_note="Patient reports increasing anxiety, panic attacks 2-3x weekly over the past 3 months. Difficulty maintaining employment. History of generalized anxiety disorder. Current on sertraline 50mg with limited response. Recommending psychiatric evaluation for medication adjustment and possible therapy referral.",
        status="pending",
        created_at=now - timedelta(days=20),
    )
    db.add(ref1)
    db.flush()

    entry1 = CareThreadEntry(
        patient_id=patients[1].id,
        referral_id=ref1.id,
        doctor_id=dr_okafor.id,
        entry_type="referral_created",
        content=ref1.clinical_note,
        created_at=ref1.created_at,
    )
    db.add(entry1)

    # Referral 2: Jean-Luc Tremblay -> cardiologist (pending, 5 days old)
    ref2 = Referral(
        patient_id=patients[2].id,
        referring_doctor_id=dr_chen.id,
        specialist_type="cardiologist",
        urgency=7,
        clinical_note="63-year-old male presenting with exertional chest tightness and shortness of breath over past 2 weeks. ECG shows nonspecific ST changes. Family history of MI (father at 58). BMI 31. Lipid panel pending. Urgent cardiology consult recommended for stress testing and further workup.",
        status="pending",
        created_at=now - timedelta(days=5),
    )
    db.add(ref2)
    db.flush()

    entry2 = CareThreadEntry(
        patient_id=patients[2].id,
        referral_id=ref2.id,
        doctor_id=dr_chen.id,
        entry_type="referral_created",
        content=ref2.clinical_note,
        created_at=ref2.created_at,
    )
    db.add(entry2)

    # Referral 3: Connor MacLeod -> orthopedic_surgeon (pending, 3 days old)
    ref3 = Referral(
        patient_id=patients[4].id,
        referring_doctor_id=dr_nair.id,
        specialist_type="orthopedic_surgeon",
        urgency=5,
        clinical_note="Patient sustained a right knee injury during recreational hockey 10 days ago. MRI reveals partial ACL tear with moderate joint effusion. Conservative management initiated with bracing and physiotherapy referral. Orthopedic consultation requested for surgical assessment and long-term management plan.",
        status="pending",
        created_at=now - timedelta(days=3),
    )
    db.add(ref3)
    db.flush()

    entry3 = CareThreadEntry(
        patient_id=patients[4].id,
        referral_id=ref3.id,
        doctor_id=dr_nair.id,
        entry_type="referral_created",
        content=ref3.clinical_note,
        created_at=ref3.created_at,
    )
    db.add(entry3)

    # Referral 4: Fatima Al-Hassan -> psychiatrist (accepted by Dr. Webb)
    # This one has a 2-entry care thread for demo
    ref4 = Referral(
        patient_id=patients[3].id,
        referring_doctor_id=dr_chen.id,
        specialist_type="psychiatrist",
        urgency=8,
        clinical_note="Patient experiencing severe postpartum depression, onset 6 weeks after delivery. Symptoms include persistent sadness, insomnia, intrusive thoughts about infant safety (non-harmful), and significant appetite loss. Edinburgh Postnatal Depression Scale score: 19/30. Immediate psychiatric evaluation recommended.",
        status="accepted",
        created_at=now - timedelta(days=10),
        accepted_at=now - timedelta(days=8),
        accepted_by_doctor_id=dr_webb.id,
    )
    db.add(ref4)
    db.flush()

    entry4a = CareThreadEntry(
        patient_id=patients[3].id,
        referral_id=ref4.id,
        doctor_id=dr_chen.id,
        entry_type="referral_created",
        content=ref4.clinical_note,
        created_at=ref4.created_at,
    )
    entry4b = CareThreadEntry(
        patient_id=patients[3].id,
        referral_id=ref4.id,
        doctor_id=dr_webb.id,
        entry_type="referral_accepted",
        content="Referral accepted by Dr. Marcus Webb (Psychiatrist). Patient will be contacted to schedule initial psychiatric assessment. Priority case — postpartum depression with Edinburgh score 19/30.",
        created_at=ref4.accepted_at,
    )
    db.add_all([entry4a, entry4b])

    db.commit()
    db.close()
    print("Database seeded successfully.")


if __name__ == "__main__":
    seed()
