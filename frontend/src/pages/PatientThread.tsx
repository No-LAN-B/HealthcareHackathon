import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPatientThread, getPatient } from "../api/client";
import type { AuthState, CareThreadEntry, Patient } from "../types";
import CareThreadTimeline from "../components/CareThreadTimeline";
import {
  LogOut,
  Stethoscope,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

export default function PatientThread({ auth, onLogout }: Props) {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [entries, setEntries] = useState<CareThreadEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    const id = Number(patientId);
    Promise.all([getPatient(id), getPatientThread(id)])
      .then(([p, e]) => {
        setPatient(p);
        setEntries(e);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {patient && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Care Thread
                  </h2>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="font-medium text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-500">
                    HC: {patient.health_card_id} &middot; DOB:{" "}
                    {patient.date_of_birth}
                  </p>
                </div>
              </div>
            )}

            {entries.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No care thread entries yet</p>
              </div>
            ) : (
              <CareThreadTimeline entries={entries} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
