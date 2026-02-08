-- migration-011-priority.sql
-- Add priority column to support_requests (P1/P2/P3, nullable)

ALTER TABLE support_requests
  ADD COLUMN priority text CHECK (priority IN ('p1', 'p2', 'p3'));
