import { useState } from "react";
import FleetMap from "./FleetMap";
import FleetManagement from "./FleetManagement";

export default function FleetTracking() {
  const [tab, setTab] = useState<"map" | "management">("map");

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fleet Tracking</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("map")}
            className={`px-4 py-1.5 rounded-lg text-sm ${
              tab === "map" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Live Map
          </button>

          <button
            onClick={() => setTab("management")}
            className={`px-4 py-1.5 rounded-lg text-sm ${
              tab === "management" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Fleet Control
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "map" && <FleetMap />}
        {tab === "management" && <FleetManagement />}
      </div>
    </div>
  );
}
