interface BadgeProps {
  variant?: "default" | "brand" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: "badge",
  brand: "badge badge-brand",
  success: "badge badge-success",
  warning: "badge badge-warning",
  error: "badge badge-error",
  info: "badge badge-info",
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={variantClasses[variant]}>{children}</span>;
}

const accountTypeBadgeVariant: Record<string, BadgeProps["variant"]> = {
  retirement: "brand",
  "non-retirement": "info",
  "tax-free": "success",
  property: "warning",
};

export function AccountTypeBadge({ type, isJoint }: { type: string; isJoint?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Badge variant={accountTypeBadgeVariant[type] || "default"}>
        {type.replace("-", " ")}
      </Badge>
      {isJoint && (
        <Badge variant="default">joint</Badge>
      )}
    </span>
  );
}

const incomeCategoryVariant: Record<string, BadgeProps["variant"]> = {
  salary: "brand",
  rental: "info",
  pension: "success",
  other: "default",
};

export function IncomeCategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant={incomeCategoryVariant[category] || "default"}>
      {category}
    </Badge>
  );
}
