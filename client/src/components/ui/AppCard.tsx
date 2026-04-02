import { colors } from "@/lib/brand";

export function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl shadow-sm border p-6 ${className}`}
      style={{
        backgroundColor: "white",
        borderColor: colors.border,
      }}
    >
      {children}
    </div>
  );
}

export function AppCardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3
          className="text-lg font-semibold"
          style={{ color: colors.primary }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            className="mt-1 text-sm"
            style={{ color: colors.textMuted }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function AppCardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
