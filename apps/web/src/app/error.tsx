"use client";

export const dynamic = "force-dynamic";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <div className="w-16 h-16 text-danger mx-auto mb-4" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Application Error</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          A critical error occurred. Please refresh the page or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Refresh Page
          </button>
          <a href="/" className="btn-secondary">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}