import type {
  AuthState,
  CareThreadEntry,
  Patient,
  Referral,
  TranscriptResponse,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function login(username: string): Promise<AuthState> {
  return request<AuthState>("/login", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function getPatients(): Promise<Patient[]> {
  return request<Patient[]>("/patients");
}

export function getPatient(id: number): Promise<Patient> {
  return request<Patient>(`/patients/${id}`);
}

export function getPatientThread(patientId: number): Promise<CareThreadEntry[]> {
  return request<CareThreadEntry[]>(`/patients/${patientId}/thread`);
}

export function getReferrals(specialty?: string): Promise<Referral[]> {
  const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : "";
  return request<Referral[]>(`/referrals${query}`);
}

export function createReferral(data: {
  patient_id: number;
  referring_doctor_id: number;
  specialist_type: string;
  urgency: number;
  clinical_note: string;
}): Promise<Referral> {
  return request<Referral>("/referrals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function acceptReferral(
  referralId: number,
  doctorId: number
): Promise<Referral> {
  return request<Referral>(`/referrals/${referralId}/accept`, {
    method: "POST",
    body: JSON.stringify({ doctor_id: doctorId }),
  });
}

export function extractTranscript(
  transcript: string
): Promise<TranscriptResponse> {
  return request<TranscriptResponse>("/ai/extract", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}

export function finalizeNote(data: {
  transcript: string;
  clinical_note: string;
  specialist_type: string;
  urgency: number;
}): Promise<{ formal_note: string }> {
  return request<{ formal_note: string }>("/ai/finalize", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
