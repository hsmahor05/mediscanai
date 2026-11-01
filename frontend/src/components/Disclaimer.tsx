import { ShieldAlert } from "lucide-react";

export const DISCLAIMER_TEXT =
  "MediScan AI is an educational project that helps organize and explain laboratory report information. It is not a medical device or a substitute for professional medical advice, diagnosis, or treatment. Please discuss medical concerns and abnormal results with a qualified healthcare professional.";

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className={`flex gap-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 ${compact ? "p-3 text-xs" : "p-4 text-sm"}`}>
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <p>{DISCLAIMER_TEXT}</p>
    </div>
  );
}
