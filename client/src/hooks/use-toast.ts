type ToastArgs = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant = "default" }: ToastArgs) => {
    console.log("[toast]", { title, description, variant });
  };

  return { toast };
}
