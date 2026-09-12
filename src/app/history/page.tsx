import Link from "next/link";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { DuplicateButton } from "@/components/DuplicateButton";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Past Assessments</h1>
        <SetupNotice />
      </div>
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: assessments } = await supabase
    .from("assessments")
    .select(
      "id, project_type, activity, assessment_date, status, reviewer_name, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Past Assessments</h1>

      {(!assessments || assessments.length === 0) && (
        <p className="text-sm text-gray-600">
          No assessments generated yet. <Link href="/" className="text-blue-600 underline">Create one</Link>.
        </p>
      )}

      {assessments && assessments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase text-gray-500">
                <th className="p-2">Project / Activity</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Reviewer</th>
                <th className="p-2">Created</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="p-2">
                    <Link
                      href={`/assessments/${a.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {a.project_type} - {a.activity}
                    </Link>
                  </td>
                  <td className="p-2">{a.assessment_date}</td>
                  <td className="p-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        a.status === "reviewed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-2">{a.reviewer_name ?? "-"}</td>
                  <td className="p-2 text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <DuplicateButton assessmentId={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
