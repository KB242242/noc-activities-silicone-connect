export default function TicketDetailLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-40 rounded-md bg-muted" />
          <div className="h-36 rounded-lg border border-border bg-card" />
          <div className="h-[32rem] rounded-lg border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
