import { z } from "zod";

export const MessageBodySchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(4000, "Message too long (max 4000 characters)")
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "Message cannot be empty");

export const MessageSchema = z.object({
  id: z.string().uuid(),
  channel_id: z.string().uuid(),
  user_id: z.string().uuid(),
  body: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateMessageSchema = z.object({
  channel_id: z.string().uuid(),
  body: MessageBodySchema,
});

export const UpdateMessageSchema = z.object({
  id: z.string().uuid(),
  body: MessageBodySchema,
});

export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;

// Extended message type with optimistic flag
export interface OptimisticMessage extends Message {
  _optimistic?: boolean;
}
