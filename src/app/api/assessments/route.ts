import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, project_type, activity, assessment_date, status, reviewer_name, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load assessments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ assessments: data });
}
