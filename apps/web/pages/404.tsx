import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>404</h1>
      <p style={{ marginBottom: "2rem", maxWidth: "400px", color: "#6b7280" }}>
        Page not found. The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", backgroundColor: "#3b82f6", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}>
        Go to Dashboard
      </Link>
    </div>
  );
}