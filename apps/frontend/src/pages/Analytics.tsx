import React from 'react';
import { useAnalyticsMetrics } from '../hooks/useApi';
import { StatCardGrid } from '../components/analytics/StatCardGrid';
import { JobsHistoryChart } from '../components/analytics/JobsHistoryChart';
import { PerformanceLatencyChart } from '../components/analytics/PerformanceLatencyChart';
import { ApiUsageChart } from '../components/analytics/ApiUsageChart';

export default function Analytics() {
  const {
    data: metrics,
    isLoading,
    error,
    dataUpdatedAt,
  } = useAnalyticsMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Advanced analytics and insights for your Square-QuickBooks
            integration.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              Loading Analytics
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Fetching the latest performance metrics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Advanced analytics and insights for your Square-QuickBooks
            integration.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Unable to Load Analytics
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There was an error loading the analytics data. Please try again
              later.
            </p>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Advanced analytics and insights for your Square-QuickBooks
            integration.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4h-3m-2-3h-5m2 3h3"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Analytics Data
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No analytics data is currently available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lastUpdated = new Date(dataUpdatedAt || Date.now());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time insights and performance metrics for your
            Square-QuickBooks integration.
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <StatCardGrid metrics={metrics} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Jobs History */}
        <JobsHistoryChart metrics={metrics} />

        {/* Performance Latency */}
        <PerformanceLatencyChart metrics={metrics} />
      </div>

      {/* API Usage Chart */}
      <ApiUsageChart metrics={metrics} />

      {/* Footer Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Analytics data refreshes automatically every 30 seconds. System
            uptime: {Math.floor(metrics.systemMetrics.uptime / 3600)}h{' '}
            {Math.floor((metrics.systemMetrics.uptime % 3600) / 60)}m
          </span>
        </div>
      </div>
    </div>
  );
}
