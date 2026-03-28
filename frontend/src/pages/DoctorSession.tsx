import { useEffect, useState, useCallback } from "react";
import { getPatient, getReferrals, acceptReferral, extractTranscript, createReferral } from "../api/client";
import type {
  AuthState,
  Appointment,
  Patient,
  Referral,
  TranscriptResponse,
} from "../types";
import TranscriptPane from "../components/TranscriptPane";
import ReferralPacket from "../components/ReferralPacket";
import ReferralCard from "../components/ReferralCard";
import {
  LogOut,
  Stethoscope,
  CheckCircle2,
  Phone,
  PhoneOff,
  Calendar,
  Clock,
  Check,
  Loader2,
  Inbox,
} from "lucide-react";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

const SPECIALISTS = [
  "psychiatrist",
  "cardiologist",
  "orthopedic_surgeon",
  "neurologist",
  "general_practitioner",
];

const TODAYS_SCHEDULE: Appointment[] = [
  { time: "8:00 AM", patientName: "Raj Patel", patientId: 9, type: "Annual Checkup", duration: "30 min" },
  { time: "8:30 AM", patientName: "Sophie Lavoie", patientId: 8, type: "Follow-up", duration: "20 min" },
  { time: "9:15 AM", patientName: "Connor MacLeod", patientId: 5, type: "Post-Op Review", duration: "30 min" },
  { time: "9:45 AM", patientName: "Mei-Lin Wong", patientId: 6, type: "Lab Results", duration: "15 min" },
  { time: "10:30 AM", patientName: "Marcus Bellamy", patientId: 1, type: "New Patient", duration: "45 min" },
  { time: "11:15 AM", patientName: "Elena Vasquez", patientId: 10, type: "Follow-up", duration: "20 min" },
  { time: "1:00 PM", patientName: "David Osei", patientId: 7, type: "Chronic Care", duration: "30 min" },
  { time: "1:30 PM", patientName: "Chloe Beaumont", patientId: 12, type: "New Patient", duration: "45 min" },
];

// Index of the "current" appointment for demo (Marcus Bellamy at 10:30 AM)
const CURRENT_INDEX = 4;

function CallTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <span className="font-mono text-sm text-gray-500">
      {mins}:{secs}
    </span>
  );
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Phase = "schedule" | "connecting" | "call";
type ScheduleTab = "schedule" | "referrals";

export default function DoctorSession({ auth, onLogout }: Props) {
  const [phase, setPhase] = useState<Phase>("schedule");
  const [activeTab, setActiveTab] = useState<ScheduleTab>("schedule");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [callStartTime, setCallStartTime] = useState<number>(0);
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState<TranscriptResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [specialistType, setSpecialistType] = useState("");
  const [urgency, setUrgency] = useState(5);
  const [clinicalNote, setClinicalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Incoming referrals state
  const [incomingReferrals, setIncomingReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  // Fetch incoming referrals for this doctor's specialty (general_practitioner for family docs)
  useEffect(() => {
    if (phase !== "schedule" || activeTab !== "referrals") return;
    setReferralsLoading(true);
    getReferrals("general_practitioner")
      .then(setIncomingReferrals)
      .catch(console.error)
      .finally(() => setReferralsLoading(false));
  }, [phase, activeTab]);

  async function handleAcceptReferral(referralId: number) {
    setAcceptingId(referralId);
    try {
      const updated = await acceptReferral(referralId, auth.doctor_id);
      setIncomingReferrals((prev) =>
        prev.map((r) => (r.id === referralId ? updated : r))
      );
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAcceptingId(null);
    }
  }

  const pendingReferrals = incomingReferrals.filter((r) => r.status === "pending");

  async function handleStartCall(appointment: Appointment) {
    setSelectedAppointment(appointment);
    setPhase("connecting");

    try {
      const patient = await getPatient(appointment.patientId);
      setSelectedPatient(patient);
    } catch {
      // Fallback — construct minimal patient from appointment
      setSelectedPatient({
        id: appointment.patientId,
        health_card_id: "----",
        name: appointment.patientName,
        email: "",
        date_of_birth: "",
      });
    }

    setTimeout(() => {
      setPhase("call");
      setCallStartTime(Date.now());
    }, 1500);
  }

  const handleExtract = useCallback(async (text: string) => {
    if (text.trim().length < 20) return;
    setExtracting(true);
    try {
      const result = await extractTranscript(text);
      setExtraction(result);
      setClinicalNote(result.clinical_summary);
      setSpecialistType(result.suggested_specialist);
      setUrgency(result.suggested_urgency);
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  }, []);

  async function handleSendReferral() {
    if (!selectedPatient || !clinicalNote || !specialistType) return;
    setSubmitting(true);
    setError("");
    try {
      await createReferral({
        patient_id: selectedPatient.id,
        referring_doctor_id: auth.doctor_id,
        specialist_type: specialistType,
        urgency,
        clinical_note: clinicalNote,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send referral");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEndCall() {
    setPhase("schedule");
    setSelectedAppointment(null);
    setSelectedPatient(null);
    setCallStartTime(0);
    setTranscript("");
    setExtraction(null);
    setSpecialistType("");
    setUrgency(5);
    setClinicalNote("");
    setSubmitted(false);
    setError("");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MedRelay</h1>
              <p className="text-xs text-gray-500">{auth.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* ── SCHEDULE VIEW ── */}
        {phase === "schedule" && (
          <div>
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab("schedule")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "schedule"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                My Schedule
              </button>
              <button
                onClick={() => setActiveTab("referrals")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "referrals"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Inbox className="w-4 h-4" />
                Incoming Referrals
                {pendingReferrals.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    {pendingReferrals.length}
                  </span>
                )}
              </button>
            </div>

            {/* SCHEDULE TAB */}
            {activeTab === "schedule" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Today&apos;s Schedule
                    </h2>
                  </div>
                  <p className="text-sm text-gray-400">{todayFormatted()}</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {TODAYS_SCHEDULE.map((appt, i) => {
                    const isPast = i < CURRENT_INDEX;
                    const isCurrent = i === CURRENT_INDEX;

                    return (
                      <div
                        key={appt.patientId}
                        className={`flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                          isPast ? "opacity-50" : ""
                        } ${isCurrent ? "border-l-4 border-l-teal-500 bg-teal-50/30" : ""}`}
                      >
                        {/* Time */}
                        <div className="w-20 shrink-0">
                          <p
                            className={`text-sm font-medium ${
                              isCurrent ? "text-teal-700" : "text-gray-500"
                            }`}
                          >
                            {appt.time}
                          </p>
                        </div>

                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium ${
                              isCurrent ? "text-teal-900" : "text-gray-900"
                            }`}
                          >
                            {appt.patientName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {appt.type}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {appt.duration}
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          {isPast ? (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Check className="w-4 h-4" />
                              Done
                            </span>
                          ) : (
                            <button
                              onClick={() => handleStartCall(appt)}
                              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                isCurrent
                                  ? "bg-teal-600 text-white hover:bg-teal-700"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              <Phone className="w-4 h-4" />
                              Start Call
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <div>
                {referralsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  </div>
                ) : pendingReferrals.length === 0 ? (
                  <div className="text-center py-20">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending referrals</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Referrals from other physicians will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingReferrals.map((referral) => (
                      <ReferralCard
                        key={referral.id}
                        referral={referral}
                        onAccept={handleAcceptReferral}
                        accepting={acceptingId === referral.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CONNECTING TRANSITION ── */}
        {phase === "connecting" && selectedAppointment && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Phone className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to appointment...
            </h2>
            <p className="text-gray-500">
              {selectedAppointment.patientName} &middot;{" "}
              {selectedAppointment.type}
            </p>
            <Loader2 className="w-5 h-5 text-teal-500 animate-spin mt-6" />
          </div>
        )}

        {/* ── CALL VIEW ── */}
        {phase === "call" && selectedPatient && !submitted && (
          <div>
            {/* In-call header bar */}
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-700">
                  In Session
                </span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {selectedPatient.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedPatient.health_card_id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {callStartTime > 0 && <CallTimer startTime={callStartTime} />}
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  End
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TranscriptPane
                transcript={transcript}
                onTranscriptChange={setTranscript}
                onExtract={handleExtract}
                extracting={extracting}
                autoStart
              />
              <ReferralPacket
                patient={selectedPatient}
                extraction={extraction}
                specialistType={specialistType}
                onSpecialistTypeChange={setSpecialistType}
                urgency={urgency}
                onUrgencyChange={setUrgency}
                clinicalNote={clinicalNote}
                onClinicalNoteChange={setClinicalNote}
                specialists={SPECIALISTS}
                onSubmit={handleSendReferral}
                submitting={submitting}
                error={error}
              />
            </div>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {phase === "call" && submitted && selectedPatient && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Referral Sent
            </h2>
            <p className="text-gray-500 mb-2">
              {selectedPatient.name} has been referred to a{" "}
              {specialistType.replace("_", " ")}
            </p>
            <p className="text-sm text-green-600 mb-8">
              Patient will be notified via email
            </p>
            <button
              onClick={handleEndCall}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
            >
              Back to Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
