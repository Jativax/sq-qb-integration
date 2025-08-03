import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type {
  OrderProcessingStats,
  QueueStats,
  WebhookEvent,
  FailedJob,
  RetryJobResponse,
} from '../services/api';

// Query keys for consistent caching
export const queryKeys = {
  health: ['health'],
  metrics: ['metrics'],
  orderStats: ['orderStats'],
  queueStats: ['queueStats'],
  recentWebhooks: ['recentWebhooks'],
  failedJobs: ['failedJobs'],
} as const;

// Health check hook
export function useHealth(): UseQueryResult<{
  status: string;
  timestamp: string;
  message: string;
}> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

// Metrics hook
export function useMetrics(): UseQueryResult<string> {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: () => apiClient.getMetrics(),
    refetchInterval: 15000, // Refetch every 15 seconds for real-time metrics
    staleTime: 10000,
  });
}

// Order statistics hook
export function useOrderStats(): UseQueryResult<OrderProcessingStats> {
  return useQuery({
    queryKey: queryKeys.orderStats,
    queryFn: () => apiClient.getOrderStats(),
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

// Queue statistics hook
export function useQueueStats(): UseQueryResult<QueueStats> {
  return useQuery({
    queryKey: queryKeys.queueStats,
    queryFn: () => apiClient.getQueueStats(),
    refetchInterval: 15000, // More frequent for queue monitoring
    staleTime: 10000,
  });
}

// Recent webhooks hook
export function useRecentWebhooks(): UseQueryResult<WebhookEvent[]> {
  return useQuery({
    queryKey: queryKeys.recentWebhooks,
    queryFn: () => apiClient.getRecentWebhooks(),
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

// Failed jobs hook
export function useFailedJobs(): UseQueryResult<FailedJob[]> {
  return useQuery({
    queryKey: queryKeys.failedJobs,
    queryFn: () => apiClient.getFailedJobs(),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time monitoring
    staleTime: 10000,
  });
}

// Retry job mutation hook
export function useRetryJob(): UseMutationResult<
  RetryJobResponse,
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => apiClient.retryJob(jobId),
    onSuccess: () => {
      // Invalidate and refetch failed jobs list when a job is retried
      queryClient.invalidateQueries({ queryKey: queryKeys.failedJobs });
      // Also invalidate queue stats to update the count
      queryClient.invalidateQueries({ queryKey: queryKeys.queueStats });
    },
  });
}
