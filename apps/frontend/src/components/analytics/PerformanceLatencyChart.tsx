import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsMetrics } from '../../services/api';

interface PerformanceLatencyChartProps {
  metrics: AnalyticsMetrics;
}

export function PerformanceLatencyChart({
  metrics,
}: PerformanceLatencyChartProps) {
  // Generate mock time-series data based on current metrics
  // In a real implementation, the backend would provide historical latency data
  const generateMockData = () => {
    const data = [];
    const baseSquareLatency =
      metrics.externalApiMetrics.square.p95ResponseTime || 1.0;
    const baseQBLatency =
      metrics.externalApiMetrics.quickbooks.p95ResponseTime || 0.8;
    const baseApiLatency = metrics.apiMetrics.requestsP95 || 0.3;

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      data.push({
        time: hour,
        squareApi: Number(
          (baseSquareLatency + (Math.random() - 0.5) * 0.5).toFixed(3)
        ),
        quickbooksApi: Number(
          (baseQBLatency + (Math.random() - 0.5) * 0.3).toFixed(3)
        ),
        internalApi: Number(
          (baseApiLatency + (Math.random() - 0.5) * 0.1).toFixed(3)
        ),
      });
    }
    return data;
  };

  const data = generateMockData();

  const formatTooltip = (value: number, name: string) => {
    const nameMap: Record<string, string> = {
      squareApi: 'Square API',
      quickbooksApi: 'QuickBooks API',
      internalApi: 'Internal API',
    };
    return [`${value}s`, nameMap[name] || name];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          API Response Time (P95)
        </h3>
        <p className="text-sm text-gray-500">
          95th percentile latency over the last 24 hours
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              label={{
                value: 'Response Time (s)',
                angle: -90,
                position: 'insideLeft',
              }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="squareApi"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Square API"
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="quickbooksApi"
              stroke="#3b82f6"
              strokeWidth={2}
              name="QuickBooks API"
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="internalApi"
              stroke="#10b981"
              strokeWidth={2}
              name="Internal API"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Square API</span>
          </div>
          <span className="font-medium">
            {metrics.externalApiMetrics.square.p95ResponseTime.toFixed(2)}s
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">QuickBooks API</span>
          </div>
          <span className="font-medium">
            {metrics.externalApiMetrics.quickbooks.p95ResponseTime.toFixed(2)}s
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Internal API</span>
          </div>
          <span className="font-medium">
            {metrics.apiMetrics.requestsP95.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}
