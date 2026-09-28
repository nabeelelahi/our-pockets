export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl text-accent-fg" aria-hidden="true">
          ◐
        </div>
        <p className="text-lg font-semibold">Our Pockets</p>
        <p className="text-sm text-muted">Your shared household budget</p>
      </div>
      {children}
    </main>
  );
}
