import { colors } from "@/lib/brand";
import { Loader2 } from "lucide-react";

export function PrimaryButton({
  children,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-5 py-3 rounded-full font-semibold transition
        flex items-center justify-center gap-2
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      style={{
        backgroundColor: colors.accent,
        color: "white",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.secondary;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.accent;
        }
      }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
