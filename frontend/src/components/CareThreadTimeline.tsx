import type { CareThreadEntry } from "../types";
import { FileText, CheckCircle2, StickyNote } from "lucide-react";

interface Props {
  entries: CareThreadEntry[];
}

function entryIcon(type: string) {
  switch (type) {
    case "referral_created":
      return <FileText className="w-4 h-4" />;
    case "referral_accepted":
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return <StickyNote className="w-4 h-4" />;
  }
}

function entryColor(type: string) {
  switch (type) {
    case "referral_created":
      return "bg-blue-100 text-blue-600 border-blue-200";
    case "referral_accepted":
      return "bg-green-100 text-green-600 border-green-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function entryLabel(type: string) {
  switch (type) {
    case "referral_created":
      return "Referral Created";
    case "referral_accepted":
      return "Referral Accepted";
    default:
      return "Note";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CareThreadTimeline({ entries }: Props) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-6">
        {entries.map((entry) => (
          <div key={entry.id} className="relative flex gap-4">
            {/* Icon circle */}
            <div
              className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${entryColor(entry.entry_type)}`}
            >
              {entryIcon(entry.entry_type)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-md border ${entryColor(entry.entry_type)}`}
                >
                  {entryLabel(entry.entry_type)}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(entry.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                {entry.content}
              </p>
              <p className="text-xs text-gray-400">
                {entry.doctor_name || `Doctor #${entry.doctor_id}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
