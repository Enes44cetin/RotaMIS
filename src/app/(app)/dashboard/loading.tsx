export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col animate-pulse">
      {/* Top Navbar Skeleton */}
      <header className="h-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
            <div className="w-28 h-6 rounded-lg bg-slate-200" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-20 h-8 rounded-full bg-slate-200" />
            <div className="w-28 h-8 rounded-full bg-slate-200" />
          </div>
        </div>
      </header>

      {/* Main Split Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] gap-6 lg:gap-8 items-start">
          {/* Left Sticky Profile Skeleton */}
          <div className="space-y-4">
            <div className="h-36 rounded-2xl bg-slate-200/80" />
            <div className="h-28 rounded-2xl bg-white border border-slate-200/70" />
            <div className="hidden lg:block h-24 rounded-2xl bg-white border border-slate-200/70" />
            <div className="hidden lg:block h-72 rounded-2xl bg-white border border-slate-200/70" />
            <div className="hidden lg:block h-48 rounded-2xl bg-white border border-slate-200/70" />
          </div>

          {/* Right Career Path Skeleton */}
          <div className="bg-white rounded-3xl border border-slate-200/70 p-5 space-y-10">
            <div className="h-36 rounded-3xl bg-slate-200/80" />

            <div className="flex flex-col items-center space-y-12 py-6">
              <div className="w-20 h-20 rounded-full bg-slate-200" />
              <div className="w-20 h-20 rounded-full bg-slate-200 translate-x-12" />
              <div className="w-20 h-20 rounded-full bg-slate-200 translate-x-16" />
              <div className="w-20 h-20 rounded-full bg-slate-200" />
              <div className="w-20 h-20 rounded-full bg-slate-200 -translate-x-12" />
              <div className="w-28 h-28 rounded-full bg-slate-200 mt-4" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

