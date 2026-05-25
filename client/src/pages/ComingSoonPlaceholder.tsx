import { AlertCircle } from "lucide-react";

export default function ComingSoonPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {description && <p className="text-gray-500 mb-4 max-w-md">{description}</p>}
      <p className="text-lg text-gray-400">Esta sección estará disponible pronto</p>
    </div>
  );
}
