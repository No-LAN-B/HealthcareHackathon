import { useNavigate } from "react-router-dom";
import type { Referral } from "../types";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface Props {
  referral: Referral;
  onAccept: (id: number) => void;
  accepting: boolean;
}

function urgencyBadge(u: number, overdue: boolean) {
  if (overdue) return "bg-red-100 text-red-700 border-red-300 animate-pulse";
  if (u >= 8) return "bg-red-100 text-red-700 border-red-200";
  if (u >= 5) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}

export default function ReferralCard({ referral, onAccept, accepting }: Props) {
  const navigate = useNavigate();
  const isAccepted = referral.status === "accepted";

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition-all ${
        referral.is_overdue
          ? "border-red-300 shadow-sm shadow-red-100"
          : "border-gray-200"
      } ${isAccepted ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${urgencyBadge(referral.urgency, referral.is_overdue)}`}
          >
            {referral.urgency}/10
          </span>
          <div>
            <p className="font-medium text-gray-900">
              {referral.patient_name || `Patient #${referral.patient_id}`}
            </p>
            <p className="text-xs text-gray-500">
              Referred by {referral.referring_doctor_name || "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {timeAgo(referral.created_at)}
        </div>
      </div>

      {referral.is_overdue && (
        <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-red-50 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs text-red-600 font-medium">
            Overdue &mdash; waiting &gt;14 days with urgency {referral.urgency}
          </span>
        </div>
      )}

      <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
        {referral.clinical_note}
      </p>

      <div className="flex items-center gap-2">
        {!isAccepted ? (
          <button
            onClick={() => onAccept(referral.id)}
            disabled={accepting}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {accepting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {accepting ? "Accepting..." : "Accept"}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            Accepted
          </span>
        )}
        <button
          onClick={() => navigate(`/patient/${referral.patient_id}/thread`)}
          className="flex items-center gap-1.5 px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Care Thread
        </button>
      </div>
    </div>
  );
}
