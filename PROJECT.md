Backend (FastAPI)
4 SQLAlchemy models: Doctor, Patient, Referral, CareThreadEntry
6 Pydantic schemas: Login, Patient, Referral, CareThread, Transcript, Doctor
15 API routes: login, patients (list/get/thread), referrals (create/list/accept), doctors, AI extract/stream/finalize, health
Seed script: 6 doctors, 12 patients, 4 pre-seeded referrals (1 overdue, 1 accepted with 2-entry care thread)
Claude AI integration: claude-sonnet-4-20250514 for transcript extraction + referral note finalization
Email service: HTML notification on referral accept via SMTP
Frontend (React + TypeScript + Tailwind)
Role-based routing: referring doctors -> /session, specialists -> /feed
Login page: doctor dropdown, localStorage auth
Doctor Session: patient roster -> transcript pane (text + optional voice) -> live AI extraction -> editable referral packet -> one-click send
Specialist Feed: urgency-sorted queue, overdue flag (red pin), accept button with optimistic UI
Care Thread: chronological timeline with entry type badges
Infrastructure
docker-compose.yml with backend + frontend services
Dockerfiles for both services
Zero TypeScript errors, strict mode on
Verified
Backend boots, all 15 routes loaded
Seed data correct: Marcus Bellamy = patient #1, Anika Sharma overdue referral, Fatima Al-Hassan 2-entry thread
Frontend builds clean (2.89s, 211KB gzip'd)
To run locally:

# Terminal 1
cd backend && python -m uvicorn main:app --reload

# Terminal 2  
cd frontend && npm run dev

Open http://localhost:5173 and follow the 3-minute demo script.