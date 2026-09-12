import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";

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

  return NextResponse.json({ assessment, rows });
}

const rowUpdateSchema = z.object({
  id: z.string().uuid(),
  hazard: z.string().min(1).optional(),
  likelihood_before: z.number().int().min(1).max(5).optional(),
  severity_before: z.number().int().min(1).max(5).optional(),
  control_measures: z.string().min(1).optional(),
  likelihood_after: z.number().int().min(1).max(5).optional(),
  severity_after: z.number().int().min(1).max(5).optional(),
  regulatory_reference: z.string().nullable().optional(),
});

const patchSchema = z.object({
  rows: z.array(rowUpdateSchema).optional(),
  signOff: z
    .object({
      reviewerName: z.string().min(1),
      reviewerRole: z.string().min(1),
    })
    .optional(),
  reopen: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { rows, signOff, reopen } = parsed.data;

  if (rows && rows.length > 0) {
    const { data: current, error: statusError } = await supabase
      .from("assessments")
      .select("status")
      .eq("id", id)
      .single();
    if (statusError || !current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (current.status === "reviewed" && !reopen) {
      return NextResponse.json(
        {
          error:
            "This assessment has been reviewed and signed off. Confirm reopening it to draft before editing.",
          code: "REQUIRES_REOPEN_CONFIRMATION",
        },
        { status: 409 }
      );
    }
    if (current.status === "reviewed" && reopen) {
      await supabase
        .from("assessments")
        .update({
          status: "draft",
          reviewer_name: null,
          reviewer_role: null,
          reviewed_at: null,
        })
        .eq("id", id);
    }

    for (const row of rows) {
      const { id: rowId, ...updates } = row;
      const { error } = await supabase
        .from("assessment_rows")
        .update(updates)
        .eq("id", rowId)
        .eq("assessment_id", id);
      if (error) {
        return NextResponse.json(
          { error: "Failed to update row", details: error.message },
          { status: 500 }
        );
      }
    }
  }

  if (signOff) {
    const { error } = await supabase
      .from("assessments")
      .update({
        status: "reviewed",
        reviewer_name: signOff.reviewerName,
        reviewer_role: signOff.reviewerRole,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Failed to sign off assessment" },
        { status: 500 }
      );
    }
  } else if (reopen) {
    const { error } = await supabase
      .from("assessments")
      .update({
        status: "draft",
        reviewer_name: null,
        reviewer_role: null,
        reviewed_at: null,
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Failed to reopen assessment" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
