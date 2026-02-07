interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = "16px", className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={{ width, height, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Skeleton width="60%" height="20px" />
      <Skeleton width="40%" height="14px" />
      <Skeleton width="80%" height="14px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Skeleton width="100%" height="40px" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width="100%" height="48px" />
      ))}
    </div>
  );
}
