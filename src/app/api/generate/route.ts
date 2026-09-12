import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateClimateRules } from "@/lib/climate";
import { retrieveHazardLibraryExcerpt } from "@/lib/hazardLibrary";
import { generateRiskMatrix } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  CLIMATE_CONDITIONS,
  LOCATION_CONTEXTS,
  PROJECT_TYPES,
} from "@/lib/types";

const requestSchema = z.object({
  projectType: z.enum(PROJECT_TYPES),
  activity: z.string().min(1).max(200),
  locationContext: z.enum(LOCATION_CONTEXTS),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedConditions: z.array(z.enum(CLIMATE_CONDITIONS)).min(1),
  crewSize: z.number().int().positive().optional(),
  workDuration: z.string().max(200).optional(),
  existingControls: z.string().max(2000).optional(),
  duplicatedFrom: z.string().uuid().optional(),
});

function getClientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  const rateLimit = checkRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          rateLimit.retryAfterMs / 60000
        )} minute(s).`,
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const climateFlags = evaluateClimateRules(
    input.assessmentDate,
    input.expectedConditions
  );

  let libraryExcerpt;
  try {
    libraryExcerpt = await retrieveHazardLibraryExcerpt(
      input.projectType,
      input.activity,
      input.expectedConditions
    );
  } catch (err) {
    console.error("Hazard library retrieval failed", err);
    return NextResponse.json(
      { error: "Failed to load reference data" },
      { status: 500 }
    );
  }

  let result;
  try {
    result = await generateRiskMatrix(input, climateFlags, libraryExcerpt);
  } catch (err) {
    console.error("Risk matrix generation failed", err);
    return NextResponse.json(
      {
        error:
          "Generation failed. The AI service may be unavailable or returned an invalid response. Please try again.",
      },
      { status: 502 }
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: assessment, error: insertError } = await supabase
    .from("assessments")
    .insert({
      project_type: input.projectType,
      activity: input.activity,
      location_context: input.locationContext,
      assessment_date: input.assessmentDate,
      expected_conditions: input.expectedConditions,
      crew_size: input.crewSize ?? null,
      work_duration: input.workDuration ?? null,
      existing_controls: input.existingControls ?? null,
      climate_flags: climateFlags,
      duplicated_from: input.duplicatedFrom ?? null,
      llm_model: result.model,
      raw_llm_response: result.rawResponse,
    })
    .select()
    .single();

  if (insertError || !assessment) {
    console.error("Failed to persist assessment", insertError);
    return NextResponse.json(
      { error: "Failed to save assessment" },
      { status: 500 }
    );
  }

  const rowsToInsert = result.rows.map((row, index) => ({
    assessment_id: assessment.id,
    sort_order: index,
    hazard: row.hazard,
    likelihood_before: row.likelihood_before,
    severity_before: row.severity_before,
    control_measures: row.control_measures,
    likelihood_after: row.likelihood_after,
    severity_after: row.severity_after,
    regulatory_reference: row.regulatory_reference ?? null,
  }));

  const { error: rowsError } = await supabase
    .from("assessment_rows")
    .insert(rowsToInsert);

  if (rowsError) {
    console.error("Failed to persist assessment rows", rowsError);
    return NextResponse.json(
      { error: "Failed to save assessment rows" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: assessment.id }, { status: 201 });
}
