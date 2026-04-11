import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useDispatchFilters } from "@/hooks/useDispatchFilters";
import { Loader2 } from "lucide-react";

export default function DispatchBoard() {
  const [viewMode] = useState<"kanban" | "table">("kanban");
  const { filters, isLoaded } = useDispatchFilters();

  const query = trpc.loads.list.useQuery(
    { status: filters.status.length > 0 ? filters.status[0] : undefined },
    { refetchInterval: 30000 }
  );

  const rawData = query.data;

  const loads = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray((rawData as any).loads)) return (rawData as any).loads;
    if (rawData && Array.isArray((rawData as any).items)) return (rawData as any).items;

    console.error("[DispatchBoard] Unexpected loads.list response shape:", rawData);
    return [];
  }, [rawData]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dispatch Board</h1>
        <div className="rounded border border-red-500 p-4">
          <p className="font-semibold">Error loading loads</p>
          <pre className="text-sm whitespace-pre-wrap mt-2">{query.error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Dispatch Board</h1>

      <div className="rounded border p-4 space-y-2">
        <p><strong>Route mounted:</strong> yes</p>
        <p><strong>Filters loaded:</strong> {isLoaded ? "yes" : "no"}</p>
        <p><strong>Query loading:</strong> {query.isLoading ? "yes" : "no"}</p>
        <p><strong>View mode:</strong> {viewMode}</p>
        <p><strong>Loads count:</strong> {loads.length}</p>
      </div>

      <div className="rounded border p-4">
        <p className="font-semibold mb-2">Raw sample</p>
        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
          {JSON.stringify(loads.slice(0, 2), null, 2)}
        </pre>
      </div>
    </div>
  );
}
