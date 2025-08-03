import React from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import {
  useOrderStats,
  useQueueStats,
  useRecentWebhooks,
  useHealth,
} from '../hooks/useApi';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
  };
  color: 'blue' | 'green' | 'yellow' | 'red';
  testId?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  testId,
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900" data-testid={testId}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center mt-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: orderStats, isLoading: orderStatsLoading } = useOrderStats();
  const { data: queueStats, isLoading: queueStatsLoading } = useQueueStats();
  const { data: recentWebhooks, isLoading: webhooksLoading } =
    useRecentWebhooks();
  const { data: health, isLoading: healthLoading } = useHealth();

  if (orderStatsLoading || queueStatsLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to the Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor your Square to QuickBooks integration in real-time. Track
          order processing, queue status, and system health.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        data-testid="order-stats"
      >
        <StatCard
          title="Total Orders"
          value={orderStats?.totalOrders || 0}
          icon={ChartBarIcon}
          trend={{ value: 12, label: 'this week' }}
          color="blue"
          testId="total-orders"
        />
        <StatCard
          title="Successful Orders"
          value={orderStats?.successfulOrders || 0}
          icon={CheckCircleIcon}
          trend={{ value: 8, label: 'success rate' }}
          color="green"
          testId="successful-orders"
        />
        <StatCard
          title="Pending Orders"
          value={orderStats?.pendingOrders || 0}
          icon={ClockIcon}
          color="yellow"
          testId="pending-orders"
        />
        <StatCard
          title="Failed Orders"
          value={orderStats?.failedOrders || 0}
          icon={ExclamationTriangleIcon}
          color="red"
          testId="failed-orders"
        />
      </div>

      {/* Queue Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <QueueListIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Queue Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {queueStats?.waiting || 0}
            </p>
            <p className="text-sm text-gray-600">Waiting</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {queueStats?.active || 0}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {queueStats?.completed || 0}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {queueStats?.failed || 0}
            </p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Webhook Events
        </h2>
        {webhooksLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentWebhooks?.map(webhook => (
              <div
                key={webhook.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{webhook.type}</p>
                  <p className="text-sm text-gray-600">
                    Order ID: {webhook.data.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(webhook.created_at).toLocaleString()}
                  </p>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Processed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          System Health
        </h2>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 bg-green-400 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">
            {health?.status === 'healthy'
              ? 'All systems operational'
              : 'System issues detected'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Last checked:{' '}
          {health?.timestamp
            ? new Date(health.timestamp).toLocaleString()
            : 'Never'}
        </p>
      </div>
    </div>
  );
}
