import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ContactStatsChartProps {
  data: {
    total: number;
    byStatus: {
      new: number;
      read: number;
      responded: number;
      archived: number;
    };
    responseRate: string;
  };
}

const COLORS = {
  new: "#ef4444",
  read: "#eab308",
  responded: "#3b82f6",
  archived: "#9ca3af",
};

const STATUS_LABELS = {
  new: "Nueva",
  read: "Leída",
  responded: "Respondida",
  archived: "Archivada",
};

export function ContactStatsChart({ data }: ContactStatsChartProps) {
  const chartData = [
    { name: STATUS_LABELS.new, value: data.byStatus.new, fill: COLORS.new },
    { name: STATUS_LABELS.read, value: data.byStatus.read, fill: COLORS.read },
    {
      name: STATUS_LABELS.responded,
      value: data.byStatus.responded,
      fill: COLORS.responded,
    },
    {
      name: STATUS_LABELS.archived,
      value: data.byStatus.archived,
      fill: COLORS.archived,
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="w-full h-96">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) =>
                `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${value} solicitudes`}
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#fff",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}
