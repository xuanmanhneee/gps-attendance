-- Keep the existing 'draft' status and its rows; add the computed status used by the API.
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'pending';
