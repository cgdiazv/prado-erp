export default function EstimatesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded bg-slate-200" />
            <div className="h-3 w-96 rounded bg-slate-200" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
            <div className="h-6 w-16 rounded bg-slate-200" />
          </div>
          <div className="h-20 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
            <div className="h-6 w-16 rounded bg-slate-200" />
          </div>
          <div className="h-20 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-3 w-24 rounded bg-slate-200 mb-3" />
            <div className="h-6 w-16 rounded bg-slate-200" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="h-11 border-b border-gray-200 bg-slate-100" />
          <div className="divide-y divide-gray-200">
            <div className="h-14 bg-white" />
            <div className="h-14 bg-white" />
            <div className="h-14 bg-white" />
            <div className="h-14 bg-white" />
            <div className="h-14 bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
