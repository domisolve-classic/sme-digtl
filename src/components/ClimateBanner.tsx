import type { ClimateFlag } from "@/lib/types";

export function ClimateBanner({ flags }: { flags: ClimateFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {flags.map((flag) => (
        <div
          key={flag.ruleKey}
          className="rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span className="font-semibold">⚠ {flag.message}</span>
          <div className="mt-1 text-xs text-amber-700">
            Reference: {flag.legalReference}
          </div>
        </div>
      ))}
    </div>
  );
}
