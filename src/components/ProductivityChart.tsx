"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProductivityChartProps {
  stats: {
    completed: number;
    inProgress: number;
    upcoming: number;
    overdue: number;
    completionRate: number;
  };
}

export function ProductivityChart({ stats }: ProductivityChartProps) {
  const data = [
    { name: "Completed", value: stats.completed, color: "#22c55e" },
    { name: "In Progress", value: stats.inProgress, color: "#a855f7" },
    { name: "Upcoming", value: stats.upcoming, color: "#3b82f6" },
    { name: "Overdue", value: stats.overdue, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Statistics</CardTitle>
        <CardDescription>
          Completion Rate: {stats.completionRate}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
