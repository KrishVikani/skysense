export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Page not found. The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/" className="btn-primary inline-flex items-center gap-2">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}