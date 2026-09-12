import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSupabaseServerClient } from "@/lib/supabase";
import { RiskAssessmentPdf } from "@/lib/pdfDocument";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (assessmentError || !assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("assessment_rows")
    .select("*")
    .eq("assessment_id", id)
    .order("sort_order", { ascending: true });

  if (rowsError) {
    return NextResponse.json(
      { error: "Failed to load assessment rows" },
      { status: 500 }
    );
  }

  const buffer = await renderToBuffer(
    <RiskAssessmentPdf assessment={assessment} rows={rows ?? []} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="risk-assessment-${id}.pdf"`,
    },
  });
}
