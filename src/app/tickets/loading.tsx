export default function TicketsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-9 w-56 rounded-md bg-muted" />
          <div className="h-14 rounded-lg border border-border bg-card" />
          <div className="h-96 rounded-lg border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
