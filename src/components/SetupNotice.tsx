export function SetupNotice() {
  return (
    <div className="rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Supabase is not configured yet.</p>
      <p className="mt-1">
        Set <code>SUPABASE_URL</code> and{" "}
        <code>SUPABASE_SERVICE_ROLE_KEY</code> (or{" "}
        <code>SUPABASE_ANON_KEY</code>) in your environment - see{" "}
        <code>.env.example</code> - then run the migrations in{" "}
        <code>supabase/migrations/</code>.
      </p>
    </div>
  );
}
