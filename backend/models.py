from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # referring | specialist
    specialty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_plain: Mapped[str] = mapped_column(String(255), nullable=False, default="password")

    referrals_made: Mapped[list["Referral"]] = relationship(
        back_populates="referring_doctor",
        foreign_keys="Referral.referring_doctor_id",
    )
    referrals_accepted: Mapped[list["Referral"]] = relationship(
        back_populates="accepted_by_doctor",
        foreign_keys="Referral.accepted_by_doctor_id",
    )
    care_thread_entries: Mapped[list["CareThreadEntry"]] = relationship(back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    health_card_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD

    referrals: Mapped[list["Referral"]] = relationship(back_populates="patient")
    care_thread_entries: Mapped[list["CareThreadEntry"]] = relationship(back_populates="patient")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    referring_doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False)
    specialist_type: Mapped[str] = mapped_column(String(100), nullable=False)
    urgency: Mapped[int] = mapped_column(Integer, nullable=False)
    clinical_note: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_by_doctor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="referrals")
    referring_doctor: Mapped["Doctor"] = relationship(
        back_populates="referrals_made",
        foreign_keys=[referring_doctor_id],
    )
    accepted_by_doctor: Mapped["Doctor | None"] = relationship(
        back_populates="referrals_accepted",
        foreign_keys=[accepted_by_doctor_id],
    )
    care_thread_entries: Mapped[list["CareThreadEntry"]] = relationship(back_populates="referral")


class CareThreadEntry(Base):
    __tablename__ = "care_thread_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False)
    referral_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("referrals.id"), nullable=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False)
    entry_type: Mapped[str] = mapped_column(String(50), nullable=False)  # referral_created | referral_accepted | note
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utc_now)

    patient: Mapped["Patient"] = relationship(back_populates="care_thread_entries")
    referral: Mapped["Referral | None"] = relationship(back_populates="care_thread_entries")
    doctor: Mapped["Doctor"] = relationship(back_populates="care_thread_entries")
