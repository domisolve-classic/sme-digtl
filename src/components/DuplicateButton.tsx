"use client";

import { useRouter } from "next/navigation";

export function DuplicateButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/new?from=${assessmentId}`)}
      className="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
    >
      Duplicate
    </button>
  );
}
