You are helping build a hackathon prototype called **MedRelay** — an agentic patient intake and referral network for physicians. The goal is to reduce friction in the care handoff process, connect siloed healthcare providers, and route patients to the right level of care faster. This is a hackathon build so prioritize a convincing, clean end-to-end demo flow over completeness. Every decision should optimize for "does this look and feel real in a 3 minute demo."

---

**PROBLEM CONTEXT**

Emergency rooms are overcrowded with non-emergency cases. Specialists have no standardized intake. Referrals are manual, paper-heavy, and relationship-dependent — if a doctor doesn't personally know a specialist, the patient may never get in. The healthcare system is described by practitioners as "a bunch of small islands of innovation with no connection to one another." The solution must add zero cognitive load to the doctor's workflow or it will not be adopted — if it adds steps, behaviour change, or friction it fails regardless of how technically impressive it is.

Key pressures the solution addresses:
- Centralized intake and referral systems (a stated government priority)
- Routing patients to the right level of care (reducing ER misuse)
- Workforce constraint — doctors are stretched thin, every saved minute matters
- Shift toward community-based and virtual care models
- Small inefficiencies at every handoff step compound into large delays at scale
- Care continuity — next doctor in the chain needs context the current doctor has

---

**WHAT YOU ARE BUILDING**

A two-sided web application with three core surfaces:

**1. Doctor Session View (Referring Physician)**
- Live appointment session UI — the doctor selects a patient from their roster to begin a session
- Ambient AI transcription agent (mic input via Web Speech API or a text-input fallback for demo) that builds structured notes in real time as the doctor speaks
- Transcript streams into Claude with a system prompt that continuously extracts: clinical summary, suggested specialist type, suggested urgency score (1–10)
- Doctor can speak or click "Send Referral" to initiate handoff
- A referral packet slides out showing: patient name, health card ID, AI-generated clinical note, specialist type, urgency score — all editable before submit
- One-click confirm sends the referral — zero forms, zero paperwork

**2. Specialist Intake Feed (Receiving Physician)**
- Real-time priority queue of all incoming referrals for that doctor's specialist type
- The feed is shared across ALL doctors of the same specialty — network effect built in, more doctors = more coverage automatically
- Sorted by urgency score descending
- Hard rule: any referral with urgency ≥ 5 that has been waiting > 14 days is flagged red and pinned to top regardless of score
- Each referral card shows: patient name, urgency badge, time since referral, referring doctor name, AI clinical summary, and a "View Full Thread" link
- "Accept" button onboards the patient — triggers email notification to patient, appends event to care thread

**3. Care Thread / Patient History**
- Single longitudinal thread per patient keyed to health card ID
- Every referral, acceptance, and clinical note appended chronologically
- Each doctor anywhere in the chain can see the full prior context — reduces repeat diagnostics and errors
- Read-only timeline view, accessible to any doctor currently holding that patient in the network

---

**TECH STACK**

- **Frontend:** React + TypeScript, Vite, Tailwind CSS
- **Backend:** FastAPI (Python 3.11+)
- **AI:** Anthropic Claude API — model `claude-sonnet-4-20250514`, used for real-time transcript-to-clinical-note extraction and referral packet generation. Stream responses where possible for live feel.
- **Database:** SQLite via SQLAlchemy (sync) — single file DB, no migrations needed for hackathon
- **Auth:** Hardcoded role-based login — a simple /login endpoint that accepts a username and returns a role ("referring" or "specialist") and a specialty type. Store in localStorage. No JWT complexity needed.
- **Email:** Python smtplib or fastapi-mail pointed at a free Resend.com account or Mailtrap for demo. Patient email is stored in mock data.
- **Package management:** npm (frontend), pip + requirements.txt (backend)
- **Containerization:** docker-compose with two services — frontend and backend — plus a volume mount for the SQLite DB file

---

**PROJECT STRUCTURE**

```
medrelay/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── database.py              # SQLAlchemy engine + session setup
│   ├── models.py                # ORM models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py              # /login
│   │   ├── patients.py          # /patients, /patients/{id}/thread
│   │   ├── referrals.py         # /referrals, /referrals/{id}/accept
│   │   └── doctors.py           # /doctors
│   ├── ai.py                    # Claude API calls — transcript → note, urgency, specialist
│   ├── email_service.py         # Patient notification email
│   ├── seed.py                  # Populate DB with mock data
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Role-based routing
│       ├── api/
│       │   └── client.ts        # Typed fetch wrappers for all endpoints
│       ├── types/
│       │   └── index.ts         # Shared TypeScript types mirroring Pydantic schemas
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── DoctorSession.tsx       # Appointment + transcription + referral packet
│       │   ├── SpecialistFeed.tsx      # Urgency queue
│       │   └── PatientThread.tsx       # Care history timeline
│       └── components/
│           ├── TranscriptPane.tsx
│           ├── ReferralPacket.tsx
│           ├── ReferralCard.tsx
│           └── CareThreadTimeline.tsx
```

---

**CORS CONFIGURATION**

In `main.py`, configure CORS to allow the Vite dev server and the dockerized frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev
        "http://localhost:3000",   # Docker frontend
        "http://frontend:3000",    # Docker internal network
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

**DOCKER COMPOSE**

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - db_data:/app/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_PORT=${EMAIL_PORT}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    command: npm run dev -- --host 0.0.0.0 --port 3000

volumes:
  db_data:
```

Backend Dockerfile:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python seed.py
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

Frontend Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

---

**DATABASE SCHEMA (SQLAlchemy models)**

```
Doctor: id, name, email, role (referring | specialist), specialty (null if referring), password_plain
Patient: id, health_card_id, name, email, date_of_birth
Referral: id, patient_id, referring_doctor_id, specialist_type, urgency (int 1-10),
          clinical_note, status (pending | accepted), created_at, accepted_at, accepted_by_doctor_id
CareThreadEntry: id, patient_id, referral_id (nullable), doctor_id, entry_type (referral_created | referral_accepted | note), content, created_at
```

---

**CLAUDE AI INTEGRATION (`ai.py`)**

Two calls to the Claude API:

**1. Live transcript extraction (called periodically as transcript grows):**
System prompt instructs Claude to act as a clinical documentation assistant. Given a raw transcript of a doctor-patient conversation, return a JSON object with:
- `clinical_summary`: 2–4 sentence structured note suitable for a specialist intake
- `suggested_specialist`: one of ["psychiatrist", "cardiologist", "orthopedic_surgeon", "neurologist", "general_practitioner"]
- `suggested_urgency`: integer 1–10 with reasoning
- `key_symptoms`: array of strings

Use `response_format` or prompt Claude to return only valid JSON with no preamble.

**2. Referral packet finalization (called on submit):**
Given the final transcript and doctor edits, generate a clean formal clinical referral note for the care thread entry.

Stream both responses where possible so the UI feels alive during the session.

---

**MOCK SEED DATA**

Seed the following on first run:

Referring doctors (role: referring):
- Dr. Sarah Chen — general practitioner at Telus Health Virtual Care
- Dr. James Okafor — virtual urgent care physician
- Dr. Priya Nair — family medicine, remote clinic

Specialist doctors (role: specialist):
- Dr. Marcus Webb — psychiatrist
- Dr. Alicia Torres — cardiologist
- Dr. David Kim — orthopedic surgeon

Patients (10–12 total) with realistic Canadian names, health card IDs in format `XXXX-XXX-XXX-XX`, emails. Pre-seed 3–4 with existing referrals in various states (pending, accepted) so the specialist feed is not empty on demo day. Pre-seed one patient with a 2-entry care thread so the history feature is demonstrable immediately.

---

**DEMO WALK-THROUGH SCRIPT (3 minutes)**

This is the exact flow the app must support flawlessly for the presentation:

**Minute 1 — Doctor Side**
1. Log in as Dr. Sarah Chen (referring doctor)
2. Select patient "Marcus Bellamy" from the patient roster — session opens
3. Begin speaking or typing into the transcript pane: *"Patient presents with persistent low mood, difficulty sleeping for the past 6 weeks, some social withdrawal. No active suicidal ideation. Previous history of anxiety. I think we need a psychiatric consult."*
4. Claude processes the transcript in real time — clinical note, specialist type (psychiatrist), and urgency score (7) appear live in the referral packet panel
5. Doctor adjusts urgency to 8, reviews the note, clicks "Send Referral"
6. Success state — referral confirmed, patient notified badge appears

**Minute 2 — Specialist Side**
1. Open new tab, log in as Dr. Marcus Webb (psychiatrist)
2. Specialist intake feed loads — Marcus Bellamy appears at top of queue (urgency 8, just referred)
3. Show the feed also has 2–3 other pending patients below for realism
4. Click into Marcus Bellamy's card — full clinical note, referring doctor, time waiting visible
5. Click "Accept" — status updates, patient email sent confirmation shown

**Minute 3 — Care Thread + Pitch Close**
1. Click "View Care Thread" for Marcus Bellamy
2. Show the full thread: referral created entry → referral accepted entry, each timestamped with doctor name and note
3. Narrate: "If Marcus now needs a cardiologist, the next doctor gets all of this context automatically. One thread, every doctor, no paperwork. The more physicians on MedRelay, the more powerful the network becomes."

---

**BUILD PRIORITIES (strict order)**

1. Docker-compose + project scaffold, both servers running and CORS verified
2. SQLAlchemy models + Pydantic schemas + seed script with all mock data
3. FastAPI core endpoints: POST /login, GET /patients, POST /referrals, GET /referrals?specialty=, POST /referrals/{id}/accept, GET /patients/{id}/thread
4. Claude AI integration — transcript → structured JSON extraction working via curl
5. React scaffold — role-based routing, typed API client, auth context from localStorage
6. Doctor session page — transcript input, live Claude note generation, referral packet panel, submit flow
7. Specialist intake feed — urgency queue, overdue flag logic, accept button, optimistic UI update
8. Patient care thread timeline view
9. Email notification on accept
10. Final polish — loading skeletons, error states, mobile layout check, demo data verified

---

**HARD CONSTRAINTS**

- Doctor flow must be completable in under 60 seconds from session open to referral sent
- Specialist feed must load in under 2 seconds — eager load all referrals for the specialty on login
- No patient-facing app or login — email notification only
- Referral packet is always editable before submission — doctor has final say, Claude only suggests
- TypeScript strict mode on — no `any` types
- All API responses typed end-to-end from Pydantic schema to TypeScript interface
- `.env` file for all secrets — never hardcoded

---

Begin by confirming the full plan, then scaffold the entire project structure, write the Docker files and docker-compose, define all SQLAlchemy models and Pydantic schemas, write the seed script, and implement all FastAPI endpoints before writing a single line of frontend code.
