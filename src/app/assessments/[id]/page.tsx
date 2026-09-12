import { notFound } from "next/navigation";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { ClimateBanner } from "@/components/ClimateBanner";
import { RiskMatrixTable, type EditableRow } from "@/components/RiskMatrixTable";
import { SetupNotice } from "@/components/SetupNotice";
import type { AssessmentStatus, ClimateFlag } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = getSupabaseServerClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (!assessment) {
    notFound();
  }

  const { data: rows } = await supabase
    .from("assessment_rows")
    .select("*")
    .eq("assessment_id", id)
    .order("sort_order", { ascending: true });

  const editableRows: EditableRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    hazard: r.hazard,
    likelihood_before: r.likelihood_before,
    severity_before: r.severity_before,
    control_measures: r.control_measures,
    likelihood_after: r.likelihood_after,
    severity_after: r.severity_after,
    regulatory_reference: r.regulatory_reference,
  }));

  const climateFlags = (assessment.climate_flags ?? []) as ClimateFlag[];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {assessment.project_type} - {assessment.activity}
        </h1>
        <p className="text-sm text-gray-600">
          Location: {assessment.location_context} | Date:{" "}
          {assessment.assessment_date} | Conditions:{" "}
          {(assessment.expected_conditions ?? []).join(", ")}
        </p>
      </div>

      <ClimateBanner flags={climateFlags} />

      <RiskMatrixTable
        assessmentId={id}
        initialRows={editableRows}
        initialStatus={assessment.status as AssessmentStatus}
        reviewerName={assessment.reviewer_name}
        reviewerRole={assessment.reviewer_role}
      />
    </div>
  );
}
