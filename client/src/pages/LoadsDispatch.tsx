import { useState } from "react";
import Loads from "./Loads";
import Quotation from "./Quotation";
import QuotationHistory from "./QuotationHistory";
import ImportBrokerLoads from "./ImportBrokerLoads";
import BrokerLoadsManagement from "./BrokerLoadsManagement";

type TabKey = "board" | "quotes" | "history" | "import" | "manage";

export default function LoadsDispatch() {
  const [tab, setTab] = useState<TabKey>("board");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "board", label: "Load Board" },
    { key: "quotes", label: "Quotes" },
    { key: "history", label: "History" },
    { key: "import", label: "Import Loads" },
    { key: "manage", label: "Manage Loads" },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Loads & Dispatch</h1>
          <p className="text-sm text-slate-400">
            Pipeline completo de cargas, cotización y asignación
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-4 py-1.5 rounded-lg text-sm ${
                tab === item.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "board" && <Loads />}
        {tab === "quotes" && <Quotation />}
        {tab === "history" && <QuotationHistory />}
        {tab === "import" && <ImportBrokerLoads />}
        {tab === "manage" && <BrokerLoadsManagement />}
      </div>
    </div>
  );
}
