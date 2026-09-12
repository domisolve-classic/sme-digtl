import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * Returns the form-input fields of a past assessment so the client can
 * pre-fill a new request form. Does NOT create a new assessment row itself
 * (no duplicated assessment/rows are persisted) - the actual generation
 * still goes through /api/generate, with assessmentDate reset to today so
 * the deterministic climate check is re-evaluated rather than carrying a
 * stale season flag. See SPEC.md section 8 (edge cases).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, project_type, activity, location_context, expected_conditions, crew_size, work_duration, existing_controls"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    projectType: data.project_type,
    activity: data.activity,
    locationContext: data.location_context,
    expectedConditions: data.expected_conditions,
    crewSize: data.crew_size,
    workDuration: data.work_duration,
    existingControls: data.existing_controls,
    duplicatedFrom: data.id,
  });
}
