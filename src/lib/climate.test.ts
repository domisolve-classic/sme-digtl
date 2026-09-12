import { describe, expect, it } from "vitest";
import { evaluateClimateRules } from "./climate";

describe("evaluateClimateRules - midday work ban window", () => {
  it("flags the ban on June 1 (start boundary, inclusive)", () => {
    const flags = evaluateClimateRules("2026-06-01", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(true);
  });

  it("flags the ban on September 15 (end boundary, inclusive)", () => {
    const flags = evaluateClimateRules("2026-09-15", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(true);
  });

  it("does not flag the ban on May 31 (just before window)", () => {
    const flags = evaluateClimateRules("2026-05-31", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(false);
  });

  it("does not flag the ban on September 16 (just after window)", () => {
    const flags = evaluateClimateRules("2026-09-16", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(false);
  });

  it("flags the ban in mid-summer", () => {
    const flags = evaluateClimateRules("2026-07-20", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(true);
  });

  it("does not flag the ban in winter", () => {
    const flags = evaluateClimateRules("2026-01-15", []);
    expect(flags.some((f) => f.ruleKey === "midday_work_ban")).toBe(false);
  });
});

describe("evaluateClimateRules - condition-triggered flags", () => {
  it("flags heat stress for extreme_heat", () => {
    const flags = evaluateClimateRules("2026-01-15", ["extreme_heat"]);
    expect(flags.some((f) => f.ruleKey === "heat_stress_general")).toBe(true);
  });

  it("flags heat stress for high_humidity", () => {
    const flags = evaluateClimateRules("2026-01-15", ["high_humidity"]);
    expect(flags.some((f) => f.ruleKey === "heat_stress_general")).toBe(true);
  });

  it("flags dust storm precautions", () => {
    const flags = evaluateClimateRules("2026-01-15", ["dust_storm"]);
    expect(flags.some((f) => f.ruleKey === "dust_storm")).toBe(true);
  });

  it("flags high wind precautions", () => {
    const flags = evaluateClimateRules("2026-01-15", ["high_wind"]);
    expect(flags.some((f) => f.ruleKey === "high_wind")).toBe(true);
  });

  it("returns no flags for normal winter conditions", () => {
    const flags = evaluateClimateRules("2026-01-15", ["normal"]);
    expect(flags).toHaveLength(0);
  });

  it("combines the ban flag with condition flags when both apply", () => {
    const flags = evaluateClimateRules("2026-07-01", [
      "extreme_heat",
      "high_wind",
    ]);
    expect(flags.map((f) => f.ruleKey).sort()).toEqual(
      ["heat_stress_general", "high_wind", "midday_work_ban"].sort()
    );
  });
});
