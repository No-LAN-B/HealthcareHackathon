# MedRelay Implementation Plan

## Context

Building a hackathon demo for MedRelay — an agentic patient intake and referral network. The existing repo has a basic FastAPI backend with different models (Patient/SpecialistIntake/Handoff) and a stub React frontend. Both need to be rewritten to match the MedRelay spec. The goal is a convincing 3-minute demo, not production completeness.

**Existing code to preserve:** Vite config (proxy setup), general project layout, `.gitignore`, `SETUP.md` structure.
**Existing code to replace:** All backend models/endpoints/schemas, all frontend components.

---

## Phase 1: Backend Foundation

### 1.1 Project scaffold + Docker files
- Create `docker-compose.yml` at repo root
- Create `backend/Dockerfile` and `frontend/Dockerfile`
- Update `backend/requirements.txt` to add: `anthropic`, `python-multipart`, `aiosmtplib` or `fastapi-mail`
- Add `backend/.env.example` with all required env vars (ANTHROPIC_API_KEY, EMAIL_*, DATABASE_URL)

**Files:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `backend/requirements.txt`, `backend/.env.example`

### 1.2 Database + Models
Rewrite `backend/models.py` with the four MedRelay tables:
- **Doctor**: id (int PK), name, email, role (referring|specialist), specialty (nullable), password_plain
- **Patient**: id (int PK), health_card_id (unique), name, email, date_of_birth
- **Referral**: id (int PK), patient_id (FK), referring_doctor_id (FK), specialist_type, urgency (int 1-10), clinical_note (text), status (pending|accepted), created_at, accepted_at (nullable), accepted_by_doctor_id (FK, nullable)
- **CareThreadEntry**: id (int PK), patient_id (FK), referral_id (FK, nullable), doctor_id (FK), entry_type (referral_created|referral_accepted|note), content (text), created_at

Update `backend/database.py` — keep SQLAlchemy sync engine with SQLite, store DB in `data/` directory for Docker volume mount.

**Files:** `backend/models.py`, `backend/database.py`

### 1.3 Pydantic Schemas
Rewrite `backend/schemas.py` (currently schemas are inline in `main.py`):
- LoginRequest / LoginResponse (doctor_id, name, role, specialty)
- PatientOut
- ReferralCreate / ReferralOut
- ReferralAccept
- CareThreadEntryOut
- TranscriptRequest / TranscriptResponse (clinical_summary, suggested_specialist, suggested_urgency, key_symptoms)

**Files:** `backend/schemas.py` (new standalone file)

### 1.4 Seed Script
Create `backend/seed.py`:
- 3 referring doctors (Dr. Sarah Chen, Dr. James Okafor, Dr. Priya Nair)
- 3 specialist doctors (Dr. Marcus Webb/psychiatrist, Dr. Alicia Torres/cardiologist, Dr. David Kim/orthopedic_surgeon)
- 10-12 patients with Canadian names, health card IDs (XXXX-XXX-XXX-XX format)
- 3-4 pre-seeded referrals (mix of pending/accepted)
- 1 patient with 2-entry care thread
- Idempotent — check if data exists before inserting

**Files:** `backend/seed.py`

### 1.5 FastAPI Routers + Endpoints
Restructure backend into router modules:

**`backend/routers/auth.py`**
- `POST /login` — accepts username string, returns doctor info + role. No JWT.

**`backend/routers/patients.py`**
- `GET /patients` — list all patients (for doctor's roster)
- `GET /patients/{id}/thread` — care thread entries for a patient, ordered chronologically

**`backend/routers/referrals.py`**
- `POST /referrals` — create referral, auto-create CareThreadEntry (referral_created)
- `GET /referrals?specialty=X` — list pending referrals filtered by specialty, sorted by urgency desc, with overdue flag logic (urgency >= 5 AND waiting > 14 days = pinned to top)
- `POST /referrals/{id}/accept` — accept referral, set accepted_at/accepted_by, create CareThreadEntry (referral_accepted), trigger email

**`backend/routers/doctors.py`**
- `GET /doctors` — list all doctors (optional, for reference)

**`backend/routers/ai.py`**
- `POST /ai/extract` — accepts transcript text, streams Claude response with clinical_summary, suggested_specialist, suggested_urgency, key_symptoms
- `POST /ai/finalize` — accepts final transcript + edits, returns formal referral note

**`backend/main.py`** — rewrite to register all routers, configure CORS for localhost:5173, localhost:3000, frontend:3000

**Files:** `backend/main.py`, `backend/routers/auth.py`, `backend/routers/patients.py`, `backend/routers/referrals.py`, `backend/routers/doctors.py`, `backend/routers/ai.py`

### 1.6 Claude AI Integration
Create `backend/ai.py`:
- `extract_from_transcript(transcript: str)` — calls Claude claude-sonnet-4-20250514 with clinical documentation system prompt, returns structured JSON
- `finalize_referral_note(transcript: str, edits: dict)` — generates formal clinical referral note
- Use streaming where possible via `client.messages.stream()`
- System prompt instructs JSON-only output with clinical_summary, suggested_specialist, suggested_urgency, key_symptoms

**Files:** `backend/ai.py`

### 1.7 Email Service
Create `backend/email_service.py`:
- `send_referral_accepted_email(patient_email, patient_name, specialist_name, specialty)` — sends notification email
- Use smtplib or fastapi-mail with env vars for config
- Graceful failure — log error but don't crash if email fails (hackathon demo)

**Files:** `backend/email_service.py`

---

## Phase 2: Frontend

### 2.1 Scaffold + Dependencies
- Update `package.json` — add Tailwind CSS, `react-router-dom`, `lucide-react` (icons)
- Configure Tailwind (postcss.config, tailwind.config)
- Rewrite `src/index.css` with Tailwind directives
- Set up `src/types/index.ts` mirroring backend Pydantic schemas
- Set up `src/api/client.ts` with typed fetch wrappers for all endpoints

**Files:** `package.json`, `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `src/types/index.ts`, `src/api/client.ts`

### 2.2 Auth + Routing
- `src/App.tsx` — React Router with auth context from localStorage, role-based route guards
- `src/pages/Login.tsx` — clean login page, dropdown or text input for doctor name, calls POST /login, stores result in localStorage, redirects by role

**Files:** `src/App.tsx`, `src/pages/Login.tsx`

### 2.3 Doctor Session Page
`src/pages/DoctorSession.tsx` — the main referring physician view:
- Patient roster sidebar — fetches GET /patients, click to select and start session
- `src/components/TranscriptPane.tsx` — text area for typing (primary for demo) + optional Web Speech API mic button. On input change (debounced ~2s), calls POST /ai/extract with accumulated transcript
- `src/components/ReferralPacket.tsx` — slide-out panel showing: patient name, health card ID, AI-generated clinical note, specialist type dropdown, urgency score slider — all editable. "Send Referral" button calls POST /referrals
- Success state with confirmation badge

**Files:** `src/pages/DoctorSession.tsx`, `src/components/TranscriptPane.tsx`, `src/components/ReferralPacket.tsx`

### 2.4 Specialist Intake Feed
`src/pages/SpecialistFeed.tsx`:
- Fetches GET /referrals?specialty={logged-in doctor's specialty} on mount
- `src/components/ReferralCard.tsx` — card for each referral: patient name, urgency badge (color-coded), time since referral, referring doctor, AI summary snippet
- Sorted by urgency desc, overdue items (urgency >= 5, waiting > 14 days) flagged red and pinned top
- "Accept" button on each card — calls POST /referrals/{id}/accept, optimistic UI update
- Link to care thread

**Files:** `src/pages/SpecialistFeed.tsx`, `src/components/ReferralCard.tsx`

### 2.5 Patient Care Thread
`src/pages/PatientThread.tsx`:
- Fetches GET /patients/{id}/thread
- `src/components/CareThreadTimeline.tsx` — vertical timeline, each entry shows: timestamp, doctor name, entry type badge, content
- Read-only view

**Files:** `src/pages/PatientThread.tsx`, `src/components/CareThreadTimeline.tsx`

---

## Phase 3: Polish

### 3.1 Final touches
- Loading skeletons / spinners on async operations
- Error toasts for failed API calls
- Verify seed data creates the exact demo scenario (Marcus Bellamy as patient, pre-seeded referrals)
- Ensure the 3-minute demo script works end-to-end
- Docker-compose verified — both services start, DB persists

---

## Verification Plan

1. `docker-compose up --build` — both services start without errors
2. Navigate to `http://localhost:3000` — login page loads
3. **Doctor flow**: Login as "Dr. Sarah Chen" → select Marcus Bellamy → type transcript → see Claude extract note/specialist/urgency live → adjust urgency → click Send Referral → success confirmation
4. **Specialist flow**: Login as "Dr. Marcus Webb" → feed shows Marcus Bellamy at top (urgency 8) + 2-3 other referrals → click Accept → confirmation shown
5. **Care thread**: Navigate to Marcus Bellamy's care thread → see referral_created and referral_accepted entries in chronological order
6. Verify overdue flag logic with pre-seeded old referral
7. Test without Docker: `cd backend && uvicorn main:app --reload` + `cd frontend && npm run dev`

---

## Build Order (matches spec priority)

1. Docker + scaffold (Phase 1.1)
2. Models + schemas + seed (Phase 1.2, 1.3, 1.4)
3. All FastAPI endpoints (Phase 1.5)
4. Claude AI integration (Phase 1.6)
5. React scaffold + auth + routing (Phase 2.1, 2.2)
6. Doctor session page (Phase 2.3)
7. Specialist feed (Phase 2.4)
8. Care thread (Phase 2.5)
9. Email service (Phase 1.7)
10. Polish (Phase 3)
