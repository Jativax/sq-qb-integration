import React, { useState } from 'react';
import {
  useAuditLogs,
  useAuditLogActions,
  useAuditLogStats,
} from '../hooks/useApi';
import type { AuditLog } from '../services/api';

export default function AuditTrail() {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Build filter params object
  const filterParams = {
    limit,
    ...(selectedAction && { action: selectedAction }),
    ...(selectedUser && { userId: selectedUser }),
  };

  // Fetch data using hooks
  const {
    data: auditLogs = [],
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAuditLogs(filterParams);

  const { data: availableActions = [], isLoading: actionsLoading } =
    useAuditLogActions();

  const { data: stats, isLoading: statsLoading } = useAuditLogStats();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) {
      return 'No details';
    }

    // Format key details for better display
    const formatted: string[] = [];

    if (details.orderId) {
      formatted.push(`Order: ${details.orderId}`);
    }

    if (details.jobId) {
      formatted.push(`Job: ${details.jobId}`);
    }

    if (details.error) {
      formatted.push(`Error: ${details.error}`);
    }

    if (details.duration !== undefined) {
      formatted.push(`Duration: ${details.duration}s`);
    }

    if (details.attempts !== undefined) {
      formatted.push(`Attempts: ${details.attempts}`);
    }

    // Add any other details not already formatted
    Object.entries(details).forEach(([key, value]) => {
      if (
        !['orderId', 'jobId', 'error', 'duration', 'attempts'].includes(key)
      ) {
        if (typeof value === 'string' || typeof value === 'number') {
          formatted.push(`${key}: ${value}`);
        }
      }
    });

    return formatted.length > 0
      ? formatted.join(' | ')
      : JSON.stringify(details);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ORDER_PROCESSED':
        return 'bg-green-100 text-green-800';
      case 'JOB_PERMANENTLY_FAILED':
        return 'bg-red-100 text-red-800';
      case 'JOB_RETRIED_BY_USER':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Get unique users from current audit logs for filter
  const uniqueUsers = React.useMemo(() => {
    const users = new Set<string>();
    auditLogs.forEach(log => {
      if (log.userId) {
        users.add(log.userId);
      }
    });
    return Array.from(users).sort();
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive log of all system and user actions
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => refetchLogs()}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {stats.totalLogs > 999 ? '999+' : stats.totalLogs}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Logs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalLogs.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">TOP</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Most Common Action
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 truncate">
                      {stats.mostCommonAction || 'None'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">USR</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Most Active User
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 truncate">
                      {stats.mostActiveUser || 'System'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">ACT</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Action Types
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Object.keys(stats.actionCounts).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Filters
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {/* Action Filter */}
            <div>
              <label
                htmlFor="action"
                className="block text-sm font-medium text-gray-700"
              >
                Action
              </label>
              <select
                id="action"
                value={selectedAction}
                onChange={e => setSelectedAction(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                disabled={actionsLoading}
              >
                <option value="">All Actions</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label
                htmlFor="user"
                className="block text-sm font-medium text-gray-700"
              >
                User
              </label>
              <select
                id="user"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Filter */}
            <div>
              <label
                htmlFor="limit"
                className="block text-sm font-medium text-gray-700"
              >
                Limit
              </label>
              <select
                id="limit"
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value={50}>50 logs</option>
                <option value={100}>100 logs</option>
                <option value={250}>250 logs</option>
                <option value={500}>500 logs</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedAction('');
                  setSelectedUser('');
                  setLimit(100);
                }}
                className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Audit Logs
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {auditLogs.length} of {limit} logs shown
              </p>
            </div>
          </div>

          {logsError && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                Failed to load audit logs: {logsError.message}
              </div>
            </div>
          )}

          {logsLoading ? (
            <div className="mt-4 text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500">
                Loading audit logs...
              </p>
            </div>
          ) : (
            <div className="mt-4 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-0"
                        >
                          Timestamp
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                          Action
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                          User
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {auditLogs.map((log: AuditLog) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getActionBadgeColor(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {log.userId || (
                              <span className="text-gray-400 italic">
                                System
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 max-w-md truncate">
                            <span title={JSON.stringify(log.details, null, 2)}>
                              {formatDetails(log.details)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {auditLogs.length === 0 && !logsLoading && (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No audit logs found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No audit logs match the current filters.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
