export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-72 rounded-md bg-muted" />
          <div className="h-32 rounded-lg border border-border bg-card" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-40 rounded-lg border border-border bg-card" />
            <div className="h-40 rounded-lg border border-border bg-card" />
            <div className="h-40 rounded-lg border border-border bg-card" />
          </div>
        </div>
      </div>
    </div>
  );
}
