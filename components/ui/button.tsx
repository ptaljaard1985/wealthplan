"use client";

import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "btn-ghost";

  const sizeStyle =
    size === "sm" ? { padding: "6px 14px", fontSize: "var(--text-xs)" } : {};

  return (
    <button
      className={`${variantClass} ${className}`}
      style={{ ...sizeStyle, display: "inline-flex", alignItems: "center", gap: "8px" }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {children}
    </button>
  );
}
