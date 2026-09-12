import type { ClimateCondition, ClimateFlag } from "./types";

/**
 * Deterministic Qatar climate/regulatory rules, evaluated in code rather than
 * left to the LLM. This is the single source of truth for the midday work
 * ban window and other climate-triggered mandates — the LLM only receives
 * the output of this function as fact and must not decide these dates itself.
 */

export const MIDDAY_BAN_RULE = {
  ruleKey: "midday_work_ban",
  // Ministerial Decision No. 16 of 2007 (as amended) — outdoor work ban
  // June 1 through September 15, 10:00-15:30.
  startMonth: 6, // June
  startDay: 1,
  endMonth: 9, // September
  endDay: 15,
  startTime: "10:00",
  endTime: "15:30",
  legalReference:
    "Ministerial Decision No. 16 of 2007 (as amended), on outdoor work hour restrictions during summer",
};

function isWithinBanWindow(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const { startMonth, startDay, endMonth, endDay } = MIDDAY_BAN_RULE;

  const afterStart =
    month > startMonth || (month === startMonth && day >= startDay);
  const beforeEnd = month < endMonth || (month === endMonth && day <= endDay);

  // Window does not wrap across year-end (June-Sept), so simple AND holds.
  return afterStart && beforeEnd;
}

/**
 * Evaluate all deterministic climate/regulatory flags for a given
 * assessment date and set of user-selected expected conditions.
 */
export function evaluateClimateRules(
  assessmentDateIso: string,
  conditions: ClimateCondition[]
): ClimateFlag[] {
  const flags: ClimateFlag[] = [];
  const date = new Date(assessmentDateIso + "T00:00:00");

  if (isWithinBanWindow(date)) {
    flags.push({
      ruleKey: MIDDAY_BAN_RULE.ruleKey,
      message: `Outdoor work is legally prohibited between ${MIDDAY_BAN_RULE.startTime} and ${MIDDAY_BAN_RULE.endTime} for this date (falls within the June 1 - September 15 summer working-hours restriction). This must be reflected in the risk assessment's control measures and work scheduling.`,
      legalReference: MIDDAY_BAN_RULE.legalReference,
    });
  }

  if (
    conditions.includes("extreme_heat") ||
    conditions.includes("high_humidity")
  ) {
    flags.push({
      ruleKey: "heat_stress_general",
      message:
        "Heat-stress mitigation is mandated regardless of the ban window: mandatory hydration schedules, shaded/air-conditioned rest areas, a buddy system for heat-illness monitoring, and acclimatization plans for new workers.",
      legalReference:
        "Qatar Labour Law, Decree No. 14 of 2004 - occupational health & safety provisions",
    });
  }

  if (conditions.includes("dust_storm")) {
    flags.push({
      ruleKey: "dust_storm",
      message:
        "Dust storm conditions require respiratory PPE provision, visibility-dependent suspension of crane/lifting operations, and vehicle movement restrictions on site.",
      legalReference: "QCS 2014, Health & Safety sections",
    });
  }

  if (conditions.includes("high_wind")) {
    flags.push({
      ruleKey: "high_wind",
      message:
        "High wind conditions require suspension of crane lifting and work-at-height activities above the manufacturer/QCS-specified wind speed threshold, and securing of loose materials.",
      legalReference: "QCS 2014, Health & Safety sections",
    });
  }

  return flags;
}
