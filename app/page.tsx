import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Swift QR</h1>
        <p className="text-muted-foreground">
          Create and manage dynamic QR codes with analytics. Sign in to get started.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
