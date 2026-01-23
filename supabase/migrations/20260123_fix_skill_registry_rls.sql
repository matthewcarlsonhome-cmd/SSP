-- Fix Skill Registry RLS Policy for Admin Access
-- Date: 2026-01-23
-- Purpose: Allow authenticated admins to seed skills from the Admin UI
--
-- The current policy only allows service_role, but the Admin UI uses
-- authenticated user credentials. This adds admin access using the
-- is_admin() function from the security hardening migration.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ADD ADMIN POLICY FOR SKILL_REGISTRY
-- ═══════════════════════════════════════════════════════════════════════════

-- Keep existing policies (public read + service_role write)
-- Add new policy for authenticated admins to manage skill_registry

-- Policy: Authenticated admins can insert/update/delete skills
CREATE POLICY "Admins can manage skill registry"
  ON public.skill_registry FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant proper permissions to authenticated users (limited by RLS to admins)
GRANT ALL ON public.skill_registry TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ADD ADMIN POLICY FOR SKILL_VERSION_HISTORY
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow admins to manage version history as well
CREATE POLICY "Admins can manage skill version history"
  ON public.skill_version_history FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT ALL ON public.skill_version_history TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADD ADMIN POLICY FOR SKILL_IMPROVEMENT_REQUESTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow admins to manage improvement requests
CREATE POLICY "Admins can manage improvement requests"
  ON public.skill_improvement_requests FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT ALL ON public.skill_improvement_requests TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This migration adds admin access to skill-related tables:
-- - skill_registry: Admins can now seed/update skill prompts
-- - skill_version_history: Admins can manage version history
-- - skill_improvement_requests: Admins can approve/reject improvements
--
-- Public read access is preserved via existing policies.
-- Anonymous grading is preserved via existing policy on skill_grades_v2.
--
