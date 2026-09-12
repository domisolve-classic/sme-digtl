export type RiskBand = "Low" | "Medium" | "High" | "Extreme";

/**
 * Standard 5x5 QCS-style banding: score = likelihood (1-5) x severity (1-5).
 */
export function riskScore(likelihood: number, severity: number): number {
  return likelihood * severity;
}

export function riskBand(score: number): RiskBand {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 15) return "High";
  return "Extreme";
}

export const RISK_BAND_COLORS: Record<RiskBand, { bg: string; text: string }> = {
  Low: { bg: "bg-green-100", text: "text-green-800" },
  Medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  High: { bg: "bg-orange-100", text: "text-orange-800" },
  Extreme: { bg: "bg-red-100", text: "text-red-800" },
};
