import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  AssessmentInput,
  ClimateFlag,
  HazardLibraryEntry,
  RiskMatrixRow,
} from "./types";

const DEFAULT_MODEL = "claude-sonnet-5";

const riskMatrixRowSchema = z.object({
  hazard: z.string().min(1),
  likelihood_before: z.number().int().min(1).max(5),
  severity_before: z.number().int().min(1).max(5),
  control_measures: z.string().min(1),
  likelihood_after: z.number().int().min(1).max(5),
  severity_after: z.number().int().min(1).max(5),
  regulatory_reference: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

const riskMatrixResponseSchema = z.object({
  rows: z.array(riskMatrixRowSchema).min(4).max(15),
});

const SYSTEM_PROMPT = `You are a Qatar-based construction health & safety specialist producing a
Construction Site Risk Assessment matrix. Your output must comply with:
- Qatar Labour Law, Decree No. 14 of 2004 (occupational health & safety
  provisions, including heat-stress/working-hours rules)
- Qatar Construction Specifications (QCS 2014), health & safety sections

You will be given:
1. Project type and specific activity
2. Site/location context
3. A set of DETERMINISTIC REGULATORY FACTS that are legally mandated for
   this date/conditions and MUST be reflected in your hazard rows exactly
   as stated - you must not contradict or soften them
4. A REFERENCE LIBRARY EXCERPT of known hazards, standard control
   measures, and regulatory references for this project type/activity -
   ground your answer in these where they apply; you may add hazards
   beyond this list based on standard GCC construction safety practice,
   but do not invent specific QCS clause numbers or law article numbers
   that are not provided to you. If you are not given a specific clause
   number, cite the law/spec by name only (e.g. "Qatar Labour Law, Decree
   No. 14 of 2004") without a fabricated section number.

For each identified hazard, you must return, via the submit_risk_matrix
tool:
- hazard: a specific, concrete hazard description (not generic)
- likelihood_before / severity_before: integers 1-5 (5x5 matrix, before
  any mitigation is applied)
- control_measures: specific, actionable control measures appropriate to
  a Qatar construction site (engineering controls first, then
  administrative, then PPE - reflect hierarchy of controls)
- likelihood_after / severity_after: integers 1-5, reflecting residual
  risk after the stated control measures are correctly implemented
- regulatory_reference: the QCS/law reference if provided in the
  reference library, otherwise a generic named reference, otherwise null

Cover at minimum: hazards specific to the stated activity, plus any
hazard implied by the deterministic regulatory facts you were given
(e.g. heat stress controls if a midday work ban applies). Do not omit a
mandated regulatory fact from the output. Produce 6-12 hazard rows -
enough to be genuinely useful on a real site, not padded with duplicates.

This output is a DRAFT for review by a licensed HSE professional before
use - do not claim certainty beyond what a professional draft warrants.`;

const TOOL_NAME = "submit_risk_matrix";

const submitRiskMatrixTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submit the completed construction site risk assessment matrix.",
  input_schema: {
    type: "object",
    properties: {
      rows: {
        type: "array",
        minItems: 4,
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            hazard: { type: "string" },
            likelihood_before: { type: "integer", minimum: 1, maximum: 5 },
            severity_before: { type: "integer", minimum: 1, maximum: 5 },
            control_measures: { type: "string" },
            likelihood_after: { type: "integer", minimum: 1, maximum: 5 },
            severity_after: { type: "integer", minimum: 1, maximum: 5 },
            regulatory_reference: { type: ["string", "null"] },
          },
          required: [
            "hazard",
            "likelihood_before",
            "severity_before",
            "control_measures",
            "likelihood_after",
            "severity_after",
          ],
        },
      },
    },
    required: ["rows"],
  },
};

function buildUserMessage(
  input: AssessmentInput,
  climateFlags: ClimateFlag[],
  libraryExcerpt: HazardLibraryEntry[]
): string {
  const factsBlock =
    climateFlags.length > 0
      ? climateFlags
          .map(
            (f) => `- [${f.ruleKey}] ${f.message} (Reference: ${f.legalReference})`
          )
          .join("\n")
      : "- No deterministic climate/regulatory facts apply for this date/conditions.";

  const libraryBlock =
    libraryExcerpt.length > 0
      ? libraryExcerpt
          .map(
            (e) =>
              `- Hazard: ${e.hazard_description}\n  Default rating: L${e.default_likelihood} x S${e.default_severity}\n  Standard controls: ${e.standard_control_measures}\n  Reference: ${e.regulatory_reference ?? "none provided"}`
          )
          .join("\n")
      : "- No curated reference entries matched this project type/activity; rely on general GCC construction safety practice and cite regulations by name only, without clause numbers.";

  return `PROJECT DETAILS
Project type: ${input.projectType}
Specific activity: ${input.activity}
Location context: ${input.locationContext}
Assessment date: ${input.assessmentDate}
Expected conditions: ${input.expectedConditions.join(", ") || "normal"}
${input.crewSize ? `Crew size: ${input.crewSize}` : ""}
${input.workDuration ? `Work duration: ${input.workDuration}` : ""}
${input.existingControls ? `Existing site controls already in place: ${input.existingControls}` : ""}

DETERMINISTIC REGULATORY FACTS (mandatory - must be reflected in your output)
${factsBlock}

REFERENCE LIBRARY EXCERPT (ground your answer in these where applicable)
${libraryBlock}

Generate the risk assessment matrix now using the submit_risk_matrix tool.`;
}

function extractToolInput(message: Anthropic.Message): unknown {
  const toolUseBlock = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  return toolUseBlock?.input;
}

/**
 * Verify every active climate flag is addressed by at least one row -
 * a cheap heuristic keyword check, not semantic understanding, but enough
 * to catch the LLM silently dropping a mandated fact.
 */
function missingClimateFlagCoverage(
  rows: RiskMatrixRow[],
  climateFlags: ClimateFlag[]
): ClimateFlag[] {
  const keywordsByRule: Record<string, string[]> = {
    midday_work_ban: ["heat", "working hour", "midday", "ban", "schedul"],
    heat_stress_general: ["heat", "hydrat", "dehydrat"],
    dust_storm: ["dust"],
    high_wind: ["wind"],
  };

  const haystack = rows
    .map((r) => `${r.hazard} ${r.control_measures}`.toLowerCase())
    .join(" ");

  return climateFlags.filter((flag) => {
    const keywords = keywordsByRule[flag.ruleKey] ?? [];
    return !keywords.some((kw) => haystack.includes(kw));
  });
}

export interface GenerateResult {
  rows: RiskMatrixRow[];
  model: string;
  rawResponse: unknown;
}

export async function generateRiskMatrix(
  input: AssessmentInput,
  climateFlags: ClimateFlag[],
  libraryExcerpt: HazardLibraryEntry[]
): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY env var");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const userMessage = buildUserMessage(input, climateFlags, libraryExcerpt);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [submitRiskMatrixTool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages,
    });

    const rawInput = extractToolInput(response);
    const parsed = riskMatrixResponseSchema.safeParse(rawInput);

    if (parsed.success) {
      const missing = missingClimateFlagCoverage(parsed.data.rows, climateFlags);
      if (missing.length === 0 || attempt === 1) {
        return { rows: parsed.data.rows, model, rawResponse: rawInput };
      }
      // Missing mandated coverage on first attempt: retry with correction.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: `Your response did not clearly address the following mandated regulatory facts in any hazard row: ${missing
          .map((f) => f.ruleKey)
          .join(
            ", "
          )}. Please resubmit the full risk matrix via submit_risk_matrix, ensuring every mandated fact is reflected in at least one row's hazard or control measures.`,
      });
      continue;
    }

    if (attempt === 1) {
      throw new Error(
        `LLM response failed schema validation after retry: ${parsed.error.message}`
      );
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Your previous response was invalid: ${parsed.error.message}. Please resubmit valid JSON matching the submit_risk_matrix schema exactly, with 4-15 rows, all required fields present, and likelihood/severity values as integers 1-5.`,
    });
  }

  throw new Error("Unreachable: generation loop exited without returning");
}
