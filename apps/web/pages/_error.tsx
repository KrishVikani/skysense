import { useEffect } from "react";
import Link from "next/link";

export default function Error({ statusCode }: { statusCode: number }) {
  useEffect(() => {
    document.title = `Error ${statusCode}`;
  }, [statusCode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px", textAlign: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Error {statusCode}</h1>
      <p style={{ marginBottom: "2rem", maxWidth: "400px" }}>
        {statusCode === 404
          ? "Page not found. The page you're looking for doesn't exist or has been moved."
          : "A critical error occurred. Please refresh the page or return to the dashboard."}
      </p>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", backgroundColor: "#3b82f6", color: "white", borderRadius: "0.5rem", textDecoration: "none" }}>
        Go to Dashboard
      </Link>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};