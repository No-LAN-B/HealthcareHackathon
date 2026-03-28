import type { Patient, TranscriptResponse } from "../types";
import { Send, Loader2, FileText, AlertTriangle } from "lucide-react";

interface Props {
  patient: Patient;
  extraction: TranscriptResponse | null;
  specialistType: string;
  onSpecialistTypeChange: (value: string) => void;
  urgency: number;
  onUrgencyChange: (value: number) => void;
  clinicalNote: string;
  onClinicalNoteChange: (value: string) => void;
  specialists: string[];
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}

function urgencyColor(u: number): string {
  if (u >= 8) return "text-red-600 bg-red-50 border-red-200";
  if (u >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-green-600 bg-green-50 border-green-200";
}

function urgencyLabel(u: number): string {
  if (u >= 9) return "Emergency";
  if (u >= 7) return "Urgent";
  if (u >= 4) return "Moderate";
  return "Routine";
}

export default function ReferralPacket({
  patient,
  extraction,
  specialistType,
  onSpecialistTypeChange,
  urgency,
  onUrgencyChange,
  clinicalNote,
  onClinicalNoteChange,
  specialists,
  onSubmit,
  submitting,
  error,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Referral Packet</h3>
      </div>

      {/* Patient Info */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <p className="font-medium text-gray-900">{patient.name}</p>
        <p className="text-sm text-gray-500">
          HC: {patient.health_card_id} &middot; DOB: {patient.date_of_birth}
        </p>
      </div>

      {/* Specialist Type */}
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Specialist Type
      </label>
      <select
        value={specialistType}
        onChange={(e) => onSpecialistTypeChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4 appearance-none"
      >
        <option value="">Select specialist...</option>
        {specialists.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>

      {/* Urgency */}
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Urgency Score
      </label>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="range"
          min={1}
          max={10}
          value={urgency}
          onChange={(e) => onUrgencyChange(Number(e.target.value))}
          className="flex-1 accent-teal-600"
        />
        <span
          className={`px-3 py-1 rounded-lg border text-sm font-semibold ${urgencyColor(urgency)}`}
        >
          {urgency} &middot; {urgencyLabel(urgency)}
        </span>
      </div>

      {/* Key Symptoms */}
      {extraction && extraction.key_symptoms.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Key Symptoms
          </label>
          <div className="flex flex-wrap gap-1.5">
            {extraction.key_symptoms.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Note */}
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Clinical Note
      </label>
      <textarea
        value={clinicalNote}
        onChange={(e) => onClinicalNoteChange(e.target.value)}
        placeholder="AI-generated clinical note will appear here as you speak..."
        className="w-full h-32 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-5"
      />

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!specialistType || !clinicalNote || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        {submitting ? "Sending..." : "Send Referral"}
      </button>
    </div>
  );
}
