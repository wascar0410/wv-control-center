import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  date: string;
  count: number;
  byStatus: {
    new: number;
    read: number;
    responded: number;
    archived: number;
  };
}

interface ContactTrendsChartProps {
  data: TrendData[];
  chartType?: "line" | "bar";
}

const COLORS = {
  new: "#ef4444",
  read: "#eab308",
  responded: "#3b82f6",
  archived: "#9ca3af",
};

export function ContactTrendsChart({
  data,
  chartType = "line",
}: ContactTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No hay datos disponibles para mostrar tendencias
      </div>
    );
  }

  // Format data for display
  const formattedData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    }),
    "Total": item.count,
    "Nueva": item.byStatus.new,
    "Leída": item.byStatus.read,
    "Respondida": item.byStatus.responded,
    "Archivada": item.byStatus.archived,
  }));

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" ? (
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#fff",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Nueva"
              stroke="#ef4444"
              strokeWidth={1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Respondida"
              stroke="#10b981"
              strokeWidth={1}
              dot={false}
            />
          </LineChart>
        ) : (
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#fff",
              }}
            />
            <Legend />
            <Bar dataKey="Nueva" stackId="a" fill="#ef4444" />
            <Bar dataKey="Leída" stackId="a" fill="#eab308" />
            <Bar dataKey="Respondida" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Archivada" stackId="a" fill="#9ca3af" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
