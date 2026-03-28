import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

from database import Base, engine
from routers import ai, auth, doctors, patients, referrals

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MedRelay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(referrals.router)
app.include_router(doctors.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"ok": True}
