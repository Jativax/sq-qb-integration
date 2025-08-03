import { z } from 'zod';

// Square Order nested structure
const SquareOrderSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
  location_id: z.string().min(1, 'Location ID is required'),
  state: z.enum(['OPEN', 'COMPLETED', 'CANCELED']),
  created_at: z
    .string()
    .datetime('Created at must be a valid ISO 8601 date string'),
  updated_at: z
    .string()
    .datetime('Updated at must be a valid ISO 8601 date string'),
  total_money: z
    .object({
      amount: z.number().int().min(0, 'Amount must be non-negative'),
      currency: z.string().min(1, 'Currency is required'),
    })
    .optional(),
});

export const SquareWebhookSchema = z.object({
  merchant_id: z.string().min(1, 'Merchant ID is required'),
  type: z.enum(['order.created', 'order.updated', 'order.fulfilled']),
  event_id: z.string().uuid('Event ID must be a valid UUID'),
  created_at: z
    .string()
    .datetime('Created at must be a valid ISO 8601 date string'),
  data: z.object({
    type: z.string().min(1, 'Data type is required'),
    id: z.string().min(1, 'Data ID is required'),
    object: z.object({
      order: SquareOrderSchema,
    }),
  }),
});

export type SquareWebhookPayload = z.infer<typeof SquareWebhookSchema>;
