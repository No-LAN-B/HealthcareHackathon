import { useEffect, useState } from "react";
import { getReferrals, acceptReferral } from "../api/client";
import type { AuthState, Referral } from "../types";
import ReferralCard from "../components/ReferralCard";
import {
  LogOut,
  Stethoscope,
  Inbox,
  Calendar,
  Loader2,
  Clock,
  Check,
  Mail,
  User,
} from "lucide-react";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

interface ScheduleSlot {
  time: string;
  patientName: string;
  type: string;
  duration: string;
  fromReferral?: boolean;
  urgency?: number;
  referringDoctor?: string;
}

// Mock existing specialist schedule
const BASE_SCHEDULE: ScheduleSlot[] = [
  { time: "8:30 AM", patientName: "Existing Patient — Follow-up", type: "Follow-up", duration: "30 min" },
  { time: "9:00 AM", patientName: "Existing Patient — Review", type: "Medication Review", duration: "45 min" },
  { time: "10:00 AM", patientName: "Existing Patient — Session", type: "Therapy Session", duration: "60 min" },
  { time: "11:00 AM", patientName: "Existing Patient — Assessment", type: "Assessment", duration: "45 min" },
  { time: "1:00 PM", patientName: "Existing Patient — Check-in", type: "Follow-up", duration: "30 min" },
];

type Tab = "schedule" | "referrals";

function urgencyToTimeframe(urgency: number): string {
  if (urgency >= 9) return "Today";
  if (urgency >= 7) return "Within 2 days";
  if (urgency >= 5) return "Within 1 week";
  return "Within 2 weeks";
}

function urgencyBadgeColor(urgency: number): string {
  if (urgency >= 8) return "bg-red-100 text-red-700 border-red-200";
  if (urgency >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

export default function SpecialistFeed({ auth, onLogout }: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("referrals");
  const [newlyAccepted, setNewlyAccepted] = useState<ScheduleSlot[]>([]);
  const [justAcceptedName, setJustAcceptedName] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.specialty) return;
    getReferrals(auth.specialty)
      .then(setReferrals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [auth.specialty]);

  async function handleAccept(referralId: number) {
    setAcceptingId(referralId);
    try {
      const updated = await acceptReferral(referralId, auth.doctor_id);
      setReferrals((prev) =>
        prev.map((r) => (r.id === referralId ? updated : r))
      );

      // Move to schedule
      const slot: ScheduleSlot = {
        time: urgencyToTimeframe(updated.urgency),
        patientName: updated.patient_name || `Patient #${updated.patient_id}`,
        type: "New Referral — Intake",
        duration: "45 min",
        fromReferral: true,
        urgency: updated.urgency,
        referringDoctor: updated.referring_doctor_name || undefined,
      };
      setNewlyAccepted((prev) => [...prev, slot]);

      // Flash confirmation
      setJustAcceptedName(slot.patientName);
      setTimeout(() => setJustAcceptedName(null), 4000);
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAcceptingId(null);
    }
  }

  const pending = referrals.filter((r) => r.status === "pending");
  const schedule = [...BASE_SCHEDULE, ...newlyAccepted];

  const specialtyDisplay = auth.specialty
    ?.replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Specialist";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MedRelay</h1>
              <p className="text-xs text-gray-500">
                {auth.name} &middot; {specialtyDisplay}
              </p>
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

      <div className="max-w-4xl mx-auto p-6">
        {/* Accepted confirmation banner */}
        {justAcceptedName && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {justAcceptedName} accepted and added to your schedule.
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <Mail className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">
                Booking email sent to patient
              </span>
            </div>
          </div>
        )}

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
            {newlyAccepted.length > 0 && (
              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                +{newlyAccepted.length}
              </span>
            )}
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
            {pending.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {/* SCHEDULE TAB */}
        {activeTab === "schedule" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString("en-CA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {schedule.map((slot, i) => (
                <div
                  key={`${slot.patientName}-${i}`}
                  className={`flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 ${
                    slot.fromReferral ? "bg-teal-50/40 border-l-4 border-l-teal-500" : ""
                  }`}
                >
                  {/* Time / Timeframe */}
                  <div className="w-28 shrink-0">
                    {slot.fromReferral ? (
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${
                          urgencyBadgeColor(slot.urgency || 5)
                        }`}
                      >
                        {slot.time}
                      </span>
                    ) : (
                      <p className="text-sm font-medium text-gray-500">
                        {slot.time}
                      </p>
                    )}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {slot.fromReferral && (
                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold uppercase rounded">
                          New
                        </span>
                      )}
                      <p className={`font-medium ${slot.fromReferral ? "text-teal-900" : "text-gray-900"}`}>
                        {slot.patientName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{slot.type}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {slot.duration}
                      </span>
                      {slot.referringDoctor && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          From {slot.referringDoctor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {slot.fromReferral ? (
                      <span className="flex items-center gap-1.5 text-xs text-teal-600">
                        <Mail className="w-3.5 h-3.5" />
                        Booking sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Check className="w-4 h-4" />
                        Confirmed
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {schedule.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REFERRALS TAB */}
        {activeTab === "referrals" && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-20">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending referrals</p>
                <p className="text-sm text-gray-400 mt-1">
                  Accepted patients appear in your schedule
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onAccept={handleAccept}
                    accepting={acceptingId === referral.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
