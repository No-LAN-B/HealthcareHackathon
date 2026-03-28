import { useEffect, useState, useCallback } from "react";
import {
  getPatients,
  extractTranscript,
  createReferral,
} from "../api/client";
import type { AuthState, Patient, TranscriptResponse } from "../types";
import TranscriptPane from "../components/TranscriptPane";
import ReferralPacket from "../components/ReferralPacket";
import {
  LogOut,
  Users,
  Stethoscope,
  CheckCircle2,
  ChevronRight,
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

export default function DoctorSession({ auth, onLogout }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState<TranscriptResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [specialistType, setSpecialistType] = useState("");
  const [urgency, setUrgency] = useState(5);
  const [clinicalNote, setClinicalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPatients().then(setPatients).catch(console.error);
  }, []);

  const handleExtract = useCallback(
    async (text: string) => {
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
    },
    []
  );

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

  function resetSession() {
    setSelectedPatient(null);
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
        {!selectedPatient ? (
          /* Patient Roster */
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900">
                Patient Roster
              </h2>
            </div>
            <div className="grid gap-3">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className="flex items-center justify-between w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all text-left"
                >
                  <div>
                    <p className="font-medium text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-500">
                      {patient.health_card_id} &middot; DOB:{" "}
                      {patient.date_of_birth}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        ) : submitted ? (
          /* Success State */
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
              onClick={resetSession}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
            >
              Start New Session
            </button>
          </div>
        ) : (
          /* Session View */
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={resetSession}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                &larr; Back to roster
              </button>
              <span className="text-gray-300">/</span>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedPatient.name}
              </h2>
              <span className="text-sm text-gray-400">
                {selectedPatient.health_card_id}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TranscriptPane
                transcript={transcript}
                onTranscriptChange={setTranscript}
                onExtract={handleExtract}
                extracting={extracting}
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
      </div>
    </div>
  );
}
