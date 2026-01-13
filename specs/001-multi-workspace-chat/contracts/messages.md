# API Contracts: Messages

**Feature**: Multi-Workspace Chat - Realtime Messaging  
**Date**: 2026-01-13  
**Status**: Draft

## Overview

Messages are accessed via Supabase client library (not REST endpoints). This document defines the data shapes and operation contracts.

---

## Zod Schemas

### Message Schema

```typescript
// src/lib/schemas/message.ts
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
```

---

## Operations

### Fetch Messages (Paginated)

**Purpose**: Load message history for a channel with cursor pagination.

**Input**:

```typescript
interface FetchMessagesParams {
	channelId: string; // UUID
	cursor?: string; // ISO timestamp (created_at of oldest loaded)
	limit?: number; // Default: 50, max: 100
}
```

**Output**:

```typescript
interface FetchMessagesResult {
	messages: Message[]; // Ordered by created_at DESC
	nextCursor: string | null; // null if no more pages
}
```

**Query**:

```typescript
const { data, error } = await supabase
	.from("messages")
	.select("*")
	.eq("channel_id", channelId)
	.lt("created_at", cursor) // Omit for first page
	.order("created_at", { ascending: false })
	.limit(limit);
```

**Errors**:
| Code | Meaning |
|------|---------|
| `PGRST301` | RLS violation (not a workspace member) |
| `22P02` | Invalid UUID format |

---

### Send Message

**Purpose**: Create a new message in a channel.

**Input**:

```typescript
interface SendMessageParams {
	channelId: string; // UUID
	body: string; // 1-4000 chars, trimmed
}
```

**Output**:

```typescript
interface SendMessageResult {
	message: Message;
}
```

**Mutation**:

```typescript
const { data, error } = await supabase
	.from("messages")
	.insert({
		channel_id: channelId,
		user_id: userId, // From auth session
		body: body.trim(),
	})
	.select()
	.single();
```

**Errors**:
| Code | Meaning |
|------|---------|
| `PGRST301` | RLS violation (not a workspace member) |
| `23503` | Foreign key violation (invalid channel_id) |
| `23514` | Check constraint violation (empty body) |

---

### Edit Message

**Purpose**: Update the body of a user's own message.

**Input**:

```typescript
interface EditMessageParams {
	messageId: string; // UUID
	body: string; // 1-4000 chars, trimmed
}
```

**Output**:

```typescript
interface EditMessageResult {
	message: Message; // With updated body and updated_at
}
```

**Mutation**:

```typescript
const { data, error } = await supabase
	.from("messages")
	.update({ body: body.trim() })
	.eq("id", messageId)
	.select()
	.single();
```

**Errors**:
| Code | Meaning |
|------|---------|
| `PGRST301` | RLS violation (not message owner) |
| `PGRST116` | No rows returned (message not found or not owned) |
| `23514` | Check constraint violation (empty body) |

---

### Delete Message

**Purpose**: Remove a user's own message.

**Input**:

```typescript
interface DeleteMessageParams {
	messageId: string; // UUID
}
```

**Output**:

```typescript
interface DeleteMessageResult {
	success: boolean;
}
```

**Mutation**:

```typescript
const { error } = await supabase.from("messages").delete().eq("id", messageId);
```

**Errors**:
| Code | Meaning |
|------|---------|
| `PGRST301` | RLS violation (not message owner) |

---

## Realtime Events

### Subscription Filter

```typescript
const channel = supabase
	.channel(`messages:${channelId}`)
	.on(
		"postgres_changes",
		{
			event: "*",
			schema: "public",
			table: "messages",
			filter: `channel_id=eq.${channelId}`,
		},
		callback
	)
	.subscribe();
```

### Event Payload

```typescript
interface RealtimePayload {
	eventType: "INSERT" | "UPDATE" | "DELETE";
	new: Message | null; // Present for INSERT, UPDATE
	old: { id: string } | null; // Present for DELETE
	commit_timestamp: string;
}
```

### Event Handling Contract

| Event    | Action                                                |
| -------- | ----------------------------------------------------- |
| `INSERT` | Append to list if `id` not present; auto-scroll       |
| `UPDATE` | Replace message if `updated_at > existing.updated_at` |
| `DELETE` | Remove message by `id`                                |

---

## Error Response Format

All errors follow this structure:

```typescript
interface SupabaseError {
	code: string; // Postgres error code
	message: string; // Human-readable message
	details: string; // Additional context
	hint: string; // Suggested fix
}
```

**Client Handling**:

```typescript
if (error) {
	if (error.code === "PGRST301" || error.code === "42501") {
		// RLS violation → generic "Access denied"
		toast.error("Access denied");
		router.push("/workspaces");
	} else if (error.code === "23514") {
		// Validation error
		toast.error("Invalid message");
	} else {
		// Unknown error
		toast.error("Something went wrong");
		console.error(error);
	}
}
```
