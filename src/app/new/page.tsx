import { AssessmentForm } from "@/components/AssessmentForm";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  ClimateCondition,
  LocationContext,
  ProjectType,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  let prefill;
  if (from && isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("assessments")
      .select(
        "id, project_type, activity, location_context, expected_conditions, crew_size, work_duration, existing_controls"
      )
      .eq("id", from)
      .single();

    if (data) {
      prefill = {
        projectType: data.project_type as ProjectType,
        activity: data.activity as string,
        locationContext: data.location_context as LocationContext,
        expectedConditions: data.expected_conditions as ClimateCondition[],
        crewSize: data.crew_size as number | null,
        workDuration: data.work_duration as string | null,
        existingControls: data.existing_controls as string | null,
        duplicatedFrom: data.id as string,
      };
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">
        {prefill ? "Duplicate Assessment" : "Generate a Risk Assessment"}
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        {prefill
          ? "Pre-filled from a past assessment. The assessment date has been reset to today so the summer working-hours check is re-evaluated for the current season."
          : "Enter the project and activity details below."}
      </p>
      <AssessmentForm prefill={prefill} />
    </div>
  );
}
