"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-3)" }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "var(--space-2)" }}>
        {error.message}
      </p>
      {error.digest && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginBottom: "var(--space-4)", fontFamily: "var(--font-mono)" }}>
          Digest: {error.digest}
        </p>
      )}
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
