"use client";

import { useState } from "react";
import { RISK_BAND_COLORS, riskBand, riskScore } from "@/lib/riskBands";
import type { AssessmentStatus } from "@/lib/types";

export interface EditableRow {
  id: string;
  hazard: string;
  likelihood_before: number;
  severity_before: number;
  control_measures: string;
  likelihood_after: number;
  severity_after: number;
  regulatory_reference: string | null;
}

function RiskCell({ likelihood, severity }: { likelihood: number; severity: number }) {
  const score = riskScore(likelihood, severity);
  const band = riskBand(score);
  const colors = RISK_BAND_COLORS[band];
  return (
    <div className={`rounded px-2 py-1 text-center text-xs font-medium ${colors.bg} ${colors.text}`}>
      {likelihood} x {severity} = {score} ({band})
    </div>
  );
}

function NumberSelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <select
      className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

export function RiskMatrixTable({
  assessmentId,
  initialRows,
  initialStatus,
  reviewerName,
  reviewerRole,
}: {
  assessmentId: string;
  initialRows: EditableRow[];
  initialStatus: AssessmentStatus;
  reviewerName: string | null;
  reviewerRole: string | null;
}) {
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [status, setStatus] = useState<AssessmentStatus>(initialStatus);
  const [reviewer, setReviewer] = useState<{ name: string; role: string }>({
    name: reviewerName ?? "",
    role: reviewerRole ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signOffName, setSignOffName] = useState("");
  const [signOffRole, setSignOffRole] = useState("");
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const locked = status === "reviewed";

  function updateRow(id: string, updates: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    setDirty(true);
  }

  async function saveRows(withReopen: boolean) {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/assessments/${assessmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          id: r.id,
          hazard: r.hazard,
          likelihood_before: r.likelihood_before,
          severity_before: r.severity_before,
          control_measures: r.control_measures,
          likelihood_after: r.likelihood_after,
          severity_after: r.severity_after,
          regulatory_reference: r.regulatory_reference,
        })),
        ...(withReopen ? { reopen: true } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 409 && data.code === "REQUIRES_REOPEN_CONFIRMATION") {
      setShowReopenConfirm(true);
      setSaving(false);
      return;
    }

    if (!res.ok) {
      setMessage(data.error ?? "Failed to save changes.");
      setSaving(false);
      return;
    }

    if (withReopen) {
      setStatus("draft");
      setReviewer({ name: "", role: "" });
    }

    setDirty(false);
    setSaving(false);
    setMessage("Changes saved.");
  }

  async function handleSignOff() {
    if (!signOffName.trim() || !signOffRole.trim()) {
      setMessage("Reviewer name and role are required to sign off.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/assessments/${assessmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signOff: { reviewerName: signOffName, reviewerRole: signOffRole },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error ?? "Failed to sign off.");
      return;
    }
    setStatus("reviewed");
    setReviewer({ name: signOffName, role: signOffRole });
    setMessage("Assessment signed off.");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          {locked ? (
            <span className="inline-block rounded bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
              REVIEWED - Signed off by {reviewer.name} ({reviewer.role})
            </span>
          ) : (
            <span className="inline-block rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
              DRAFT - Requires review by a certified HSE professional
            </span>
          )}
        </div>
        <a
          href={`/api/assessments/${assessmentId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Export PDF
        </a>
      </div>

      {message && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {message}
        </div>
      )}

      {showReopenConfirm && (
        <div className="mb-4 rounded border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <p className="mb-2">
            This assessment was signed off. Saving these edits will revert it
            to draft status and require re-sign-off. Continue?
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-orange-600 px-3 py-1.5 text-white text-xs font-medium"
              onClick={() => {
                setShowReopenConfirm(false);
                saveRows(true);
              }}
            >
              Yes, reopen and save
            </button>
            <button
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium"
              onClick={() => setShowReopenConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-left text-xs">
              <th className="p-2">Hazard</th>
              <th className="p-2">Risk Before</th>
              <th className="p-2">Control Measures</th>
              <th className="p-2">Risk After</th>
              <th className="p-2">Regulatory Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-200 align-top">
                <td className="p-2 w-[22%]">
                  <textarea
                    className="w-full resize-none rounded border border-gray-200 p-1 text-xs"
                    rows={3}
                    value={row.hazard}
                    disabled={locked}
                    onChange={(e) => updateRow(row.id, { hazard: e.target.value })}
                  />
                </td>
                <td className="p-2 w-[12%]">
                  <div className="mb-1 flex gap-1">
                    <NumberSelect
                      value={row.likelihood_before}
                      disabled={locked}
                      onChange={(v) => updateRow(row.id, { likelihood_before: v })}
                    />
                    <NumberSelect
                      value={row.severity_before}
                      disabled={locked}
                      onChange={(v) => updateRow(row.id, { severity_before: v })}
                    />
                  </div>
                  <RiskCell
                    likelihood={row.likelihood_before}
                    severity={row.severity_before}
                  />
                </td>
                <td className="p-2 w-[30%]">
                  <textarea
                    className="w-full resize-none rounded border border-gray-200 p-1 text-xs"
                    rows={3}
                    value={row.control_measures}
                    disabled={locked}
                    onChange={(e) =>
                      updateRow(row.id, { control_measures: e.target.value })
                    }
                  />
                </td>
                <td className="p-2 w-[12%]">
                  <div className="mb-1 flex gap-1">
                    <NumberSelect
                      value={row.likelihood_after}
                      disabled={locked}
                      onChange={(v) => updateRow(row.id, { likelihood_after: v })}
                    />
                    <NumberSelect
                      value={row.severity_after}
                      disabled={locked}
                      onChange={(v) => updateRow(row.id, { severity_after: v })}
                    />
                  </div>
                  <RiskCell
                    likelihood={row.likelihood_after}
                    severity={row.severity_after}
                  />
                </td>
                <td className="p-2 w-[24%]">
                  <textarea
                    className="w-full resize-none rounded border border-gray-200 p-1 text-xs"
                    rows={3}
                    value={row.regulatory_reference ?? ""}
                    disabled={locked}
                    onChange={(e) =>
                      updateRow(row.id, { regulatory_reference: e.target.value })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={!dirty || saving}
            onClick={() => saveRows(false)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {!locked && (
        <div className="mt-8 rounded border border-gray-300 p-4">
          <h3 className="mb-3 font-semibold">Sign Off</h3>
          <p className="mb-3 text-xs text-gray-600">
            Save any pending edits before signing off. Signing off finalizes
            this assessment and locks the rows from silent edits.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reviewer name"
              value={signOffName}
              onChange={(e) => setSignOffName(e.target.value)}
            />
            <input
              className="rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reviewer role (e.g. Site HSE Officer)"
              value={signOffRole}
              onChange={(e) => setSignOffRole(e.target.value)}
            />
            <button
              onClick={handleSignOff}
              disabled={saving || dirty}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              title={dirty ? "Save changes before signing off" : undefined}
            >
              Sign Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
