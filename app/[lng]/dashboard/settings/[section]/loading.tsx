export default function SettingsSectionLoading() {
  return (
    <div className="space-y-6 animate-pulse min-w-0">
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-xs">
        <div className="h-6 w-48 bg-slate-200 rounded mb-3" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-8" />
        <div className="space-y-4">
          <div className="h-11 bg-slate-100 rounded-lg w-full" />
          <div className="h-11 bg-slate-100 rounded-lg w-full" />
          <div className="h-11 bg-slate-100 rounded-lg w-3/4" />
        </div>
      </div>
    </div>
  );
}
