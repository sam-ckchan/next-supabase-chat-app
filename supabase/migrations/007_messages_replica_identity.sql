-- Migration: 007_messages_replica_identity.sql
-- Fix realtime DELETE events not being received by channel members
-- 
-- Problem: When a message is deleted, only the sender receives the realtime
-- DELETE event because Supabase Realtime checks RLS policies. The DELETE
-- policy only allows user_id = auth.uid(), so other channel members don't
-- see the deletion in realtime.
--
-- Solution: Set REPLICA IDENTITY FULL on the messages table. This ensures
-- the full row data is available in the WAL for DELETE events, allowing
-- Supabase Realtime to check the SELECT policy (which allows all workspace
-- members) instead of the DELETE policy (which only allows the message owner).

ALTER TABLE messages REPLICA IDENTITY FULL;
