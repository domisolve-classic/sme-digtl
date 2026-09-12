"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACTIVITIES_BY_PROJECT_TYPE,
  CLIMATE_CONDITIONS,
  LOCATION_CONTEXTS,
  PROJECT_TYPES,
  type ClimateCondition,
  type LocationContext,
  type ProjectType,
} from "@/lib/types";

function suggestedConditionsForDate(dateIso: string): ClimateCondition[] {
  const date = new Date(dateIso + "T00:00:00");
  const month = date.getMonth() + 1;
  if (month >= 6 && month <= 9) {
    return ["extreme_heat", "high_humidity"];
  }
  return ["normal"];
}

interface PrefillData {
  projectType?: ProjectType;
  activity?: string;
  locationContext?: LocationContext;
  expectedConditions?: ClimateCondition[];
  crewSize?: number | null;
  workDuration?: string | null;
  existingControls?: string | null;
  duplicatedFrom?: string;
}

export function AssessmentForm({ prefill }: { prefill?: PrefillData }) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [projectType, setProjectType] = useState<ProjectType>(
    prefill?.projectType ?? "high-rise"
  );
  const [activity, setActivity] = useState(prefill?.activity ?? "");
  const [customActivity, setCustomActivity] = useState("");
  const [locationContext, setLocationContext] = useState<LocationContext>(
    prefill?.locationContext ?? "urban"
  );
  const [assessmentDate, setAssessmentDate] = useState(today);
  const [expectedConditions, setExpectedConditions] = useState<
    ClimateCondition[]
  >(prefill?.expectedConditions ?? suggestedConditionsForDate(today));
  const [crewSize, setCrewSize] = useState(
    prefill?.crewSize ? String(prefill.crewSize) : ""
  );
  const [workDuration, setWorkDuration] = useState(prefill?.workDuration ?? "");
  const [existingControls, setExistingControls] = useState(
    prefill?.existingControls ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activityOptions = ACTIVITIES_BY_PROJECT_TYPE[projectType];

  function handleDateChange(newDate: string) {
    setAssessmentDate(newDate);
    if (!prefill) {
      setExpectedConditions(suggestedConditionsForDate(newDate));
    }
  }

  function toggleCondition(condition: ClimateCondition) {
    setExpectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev.filter((c) => c !== "normal"), condition]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalActivity =
      activity === "__custom__" ? customActivity.trim() : activity;

    if (!finalActivity) {
      setError("Please select or enter a specific activity.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          activity: finalActivity,
          locationContext,
          assessmentDate,
          expectedConditions:
            expectedConditions.length > 0 ? expectedConditions : ["normal"],
          crewSize: crewSize ? Number(crewSize) : undefined,
          workDuration: workDuration || undefined,
          existingControls: existingControls || undefined,
          duplicatedFrom: prefill?.duplicatedFrom,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/assessments/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Project Type</label>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2"
          value={projectType}
          onChange={(e) => {
            setProjectType(e.target.value as ProjectType);
            setActivity("");
          }}
        >
          {PROJECT_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Specific Activity
        </label>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        >
          <option value="">Select an activity...</option>
          {activityOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value="__custom__">Other (specify)...</option>
        </select>
        {activity === "__custom__" && (
          <input
            type="text"
            className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Describe the specific activity"
            value={customActivity}
            onChange={(e) => setCustomActivity(e.target.value)}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Location Context
        </label>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2"
          value={locationContext}
          onChange={(e) => setLocationContext(e.target.value as LocationContext)}
        >
          {LOCATION_CONTEXTS.map((lc) => (
            <option key={lc} value={lc}>
              {lc}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Assessment Date
        </label>
        <input
          type="date"
          className="w-full rounded border border-gray-300 px-3 py-2"
          value={assessmentDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Expected Conditions
        </label>
        <div className="flex flex-wrap gap-2">
          {CLIMATE_CONDITIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => toggleCondition(c)}
              className={`rounded-full border px-3 py-1 text-sm ${
                expectedConditions.includes(c)
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {c.replace("_", " ")}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Pre-selected based on the assessment date&apos;s season - adjust as
          needed.
        </p>
      </div>

      <details className="rounded border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Optional details
        </summary>
        <div className="mt-3 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Crew Size
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={crewSize}
              onChange={(e) => setCrewSize(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Work Duration
            </label>
            <input
              type="text"
              placeholder="e.g. 3 days"
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={workDuration}
              onChange={(e) => setWorkDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Existing Site Controls Already In Place
            </label>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2"
              rows={3}
              value={existingControls}
              onChange={(e) => setExistingControls(e.target.value)}
            />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Generating..." : "Generate Risk Assessment"}
      </button>
    </form>
  );
}
