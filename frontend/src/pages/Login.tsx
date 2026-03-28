import { useState } from "react";
import { login } from "../api/client";
import type { AuthState } from "../types";
import { Stethoscope, LogIn, Loader2 } from "lucide-react";

interface Props {
  onLogin: (state: AuthState) => void;
}

const DOCTORS = [
  "Dr. Sarah Chen",
  "Dr. James Okafor",
  "Dr. Priya Nair",
  "Dr. Marcus Webb",
  "Dr. Alicia Torres",
  "Dr. David Kim",
];

export default function Login({ onLogin }: Props) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const auth = await login(selected);
      onLogin(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MedRelay</h1>
          <p className="text-gray-500 mt-2">
            Physician Referral Network
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sign in as
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-6 appearance-none"
          >
            <option value="">Select a physician...</option>
            {DOCTORS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={!selected || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Hackathon Demo &middot; No real patient data
        </p>
      </div>
    </div>
  );
}
