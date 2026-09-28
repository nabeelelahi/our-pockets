export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="mx-auto h-7 w-44 rounded-lg bg-card-muted" />
      <div className="h-36 rounded-2xl bg-card-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-card-muted" />
        ))}
      </div>
    </div>
  );
}
