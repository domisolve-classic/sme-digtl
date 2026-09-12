import { getSupabaseServerClient } from "./supabase";
import type { ClimateCondition, HazardLibraryEntry, ProjectType } from "./types";

/**
 * RAG-lite retrieval: pull curated hazard/control entries matching the
 * project type + activity, plus any entries whose climate_trigger matches
 * the selected expected conditions. See SPEC.md section 6.
 */
export async function retrieveHazardLibraryExcerpt(
  projectType: ProjectType,
  activity: string,
  conditions: ClimateCondition[]
): Promise<HazardLibraryEntry[]> {
  const supabase = getSupabaseServerClient();

  const { data: activityMatches, error: activityError } = await supabase
    .from("hazard_library")
    .select("*")
    .eq("project_type", projectType)
    .eq("activity", activity);

  if (activityError) throw activityError;

  let rows = activityMatches ?? [];

  // Fallback to project-type-only matches if no exact activity match found.
  if (rows.length === 0) {
    const { data: projectMatches, error: projectError } = await supabase
      .from("hazard_library")
      .select("*")
      .eq("project_type", projectType);
    if (projectError) throw projectError;
    rows = projectMatches ?? [];
  }

  const climateTriggers = conditions.filter((c) => c !== "normal");
  if (climateTriggers.length > 0) {
    const { data: climateMatches, error: climateError } = await supabase
      .from("hazard_library")
      .select("*")
      .in("climate_trigger", climateTriggers);
    if (climateError) throw climateError;

    const seen = new Set(rows.map((r) => r.id));
    for (const row of climateMatches ?? []) {
      if (!seen.has(row.id)) {
        rows.push(row);
        seen.add(row.id);
      }
    }
  }

  return rows as HazardLibraryEntry[];
}
