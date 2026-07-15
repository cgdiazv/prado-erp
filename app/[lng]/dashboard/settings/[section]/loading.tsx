export default function SettingsSectionLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl space-y-6 animate-pulse">
        <div className="flex items-center justify-between border-b border-gray-200 pb-5">
          <div className="space-y-2">
            <div className="h-6 w-64 rounded bg-slate-200" />
            <div className="h-3 w-96 rounded bg-slate-200" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
          <div className="h-9 w-44 rounded-lg bg-slate-200" />
          <div className="h-9 w-32 rounded-lg bg-slate-200" />
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-10 w-full rounded-lg bg-slate-100" />
            <div className="h-10 w-full rounded-lg bg-slate-100" />
            <div className="h-10 w-2/3 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
