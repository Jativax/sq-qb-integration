import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsMetrics } from '../../services/api';

interface JobsHistoryChartProps {
  metrics: AnalyticsMetrics;
}

export function JobsHistoryChart({ metrics }: JobsHistoryChartProps) {
  // For now, we'll show current status as historical data
  // In a real implementation, the backend would provide time-series data
  const data = [
    {
      name: 'Current Period',
      completed: metrics.jobsProcessed.completed,
      failed: metrics.jobsProcessed.failed,
      active: metrics.jobsProcessed.active,
      waiting: metrics.jobsProcessed.waiting,
    },
    // Mock some historical data for demonstration
    {
      name: 'Previous Period',
      completed: Math.max(
        0,
        metrics.jobsProcessed.completed - Math.floor(Math.random() * 20)
      ),
      failed: Math.max(
        0,
        metrics.jobsProcessed.failed - Math.floor(Math.random() * 5)
      ),
      active: Math.floor(Math.random() * 3),
      waiting: Math.floor(Math.random() * 10),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Job Processing History
        </h3>
        <p className="text-sm text-gray-500">
          Overview of job processing status over time
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="completed"
              stackId="a"
              fill="#10b981"
              name="Completed"
            />
            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            <Bar dataKey="active" stackId="a" fill="#f59e0b" name="Active" />
            <Bar dataKey="waiting" stackId="a" fill="#6b7280" name="Waiting" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-gray-600">
            Completed: {metrics.jobsProcessed.completed}
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-gray-600">
            Failed: {metrics.jobsProcessed.failed}
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span className="text-gray-600">
            Active: {metrics.jobsProcessed.active}
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
          <span className="text-gray-600">
            Waiting: {metrics.jobsProcessed.waiting}
          </span>
        </div>
      </div>
    </div>
  );
}
