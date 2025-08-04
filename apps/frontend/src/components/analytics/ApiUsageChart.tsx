import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { AnalyticsMetrics } from '../../services/api';

interface ApiUsageChartProps {
  metrics: AnalyticsMetrics;
}

export function ApiUsageChart({ metrics }: ApiUsageChartProps) {
  const totalCalls =
    metrics.externalApiMetrics.square.totalCalls +
    metrics.externalApiMetrics.quickbooks.totalCalls;

  // Data for pie chart
  const pieData = [
    {
      name: 'Square API',
      value: metrics.externalApiMetrics.square.totalCalls,
      percentage:
        totalCalls > 0
          ? (
              (metrics.externalApiMetrics.square.totalCalls / totalCalls) *
              100
            ).toFixed(1)
          : '0',
    },
    {
      name: 'QuickBooks API',
      value: metrics.externalApiMetrics.quickbooks.totalCalls,
      percentage:
        totalCalls > 0
          ? (
              (metrics.externalApiMetrics.quickbooks.totalCalls / totalCalls) *
              100
            ).toFixed(1)
          : '0',
    },
  ];

  // Data for comparison bar chart
  const barData = [
    {
      name: 'Square',
      calls: metrics.externalApiMetrics.square.totalCalls,
      avgLatency: metrics.externalApiMetrics.square.averageResponseTime,
      p95Latency: metrics.externalApiMetrics.square.p95ResponseTime,
    },
    {
      name: 'QuickBooks',
      calls: metrics.externalApiMetrics.quickbooks.totalCalls,
      avgLatency: metrics.externalApiMetrics.quickbooks.averageResponseTime,
      p95Latency: metrics.externalApiMetrics.quickbooks.p95ResponseTime,
    },
  ];

  const COLORS = ['#f59e0b', '#3b82f6'];

  const renderLabel = (entry: { percentage: number }) => {
    return `${entry.percentage}%`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          External API Usage
        </h3>
        <p className="text-sm text-gray-500">
          Distribution and performance of external API calls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - API Call Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Call Distribution
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Calls']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-2">
            {pieData.map((entry, index) => (
              <div
                key={entry.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index] }}
                  ></div>
                  <span className="text-gray-600">{entry.name}</span>
                </div>
                <span className="font-medium">
                  {entry.value} calls ({entry.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart - Performance Comparison */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Performance Comparison
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  label={{
                    value: 'Response Time (s)',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(3)}s`,
                    name === 'avgLatency' ? 'Avg Latency' : 'P95 Latency',
                  ]}
                />
                <Legend />
                <Bar dataKey="avgLatency" fill="#10b981" name="Avg Latency" />
                <Bar dataKey="p95Latency" fill="#ef4444" name="P95 Latency" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {totalCalls}
            </div>
            <div className="text-gray-600">Total API Calls</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {metrics.externalApiMetrics.square.totalCalls}
            </div>
            <div className="text-gray-600">Square Calls</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {metrics.externalApiMetrics.quickbooks.totalCalls}
            </div>
            <div className="text-gray-600">QuickBooks Calls</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {metrics.webhookMetrics.totalReceived}
            </div>
            <div className="text-gray-600">Webhooks Received</div>
          </div>
        </div>
      </div>
    </div>
  );
}
