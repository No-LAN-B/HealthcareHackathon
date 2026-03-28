import { useEffect, useState } from "react";
import { getReferrals, acceptReferral } from "../api/client";
import type { AuthState, Referral } from "../types";
import ReferralCard from "../components/ReferralCard";
import { LogOut, Stethoscope, Inbox, Loader2 } from "lucide-react";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

export default function SpecialistFeed({ auth, onLogout }: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

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
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAcceptingId(null);
    }
  }

  const pending = referrals.filter((r) => r.status === "pending");
  const accepted = referrals.filter((r) => r.status === "accepted");

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
                {auth.name} &middot;{" "}
                {auth.specialty?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
        <div className="flex items-center gap-2 mb-6">
          <Inbox className="w-5 h-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900">
            Incoming Referrals
          </h2>
          {pending.length > 0 && (
            <span className="ml-2 px-2.5 py-0.5 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : pending.length === 0 && accepted.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No referrals yet</p>
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
            {accepted.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Accepted
                  </p>
                </div>
                {accepted.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onAccept={handleAccept}
                    accepting={false}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
