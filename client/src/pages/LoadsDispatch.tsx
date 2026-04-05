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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950 px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Loads & Dispatch</h1>
            <p className="mt-1 text-sm text-slate-300">
              Pipeline completo de cargas, cotización y asignación
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => {
              const active = tab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                      : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-950">
        {tab === "board" && <Loads />}
        {tab === "quotes" && <Quotation />}
        {tab === "history" && <QuotationHistory />}
        {tab === "import" && <ImportBrokerLoads />}
        {tab === "manage" && <BrokerLoadsManagement />}
      </div>
    </div>
  );
}
