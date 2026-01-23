-- Security Fix Migration: RLS Policy Hardening
-- Date: 2026-01-23
-- Purpose: Fix critical security vulnerabilities identified in security audit
--
-- CRITICAL: This migration fixes publicly exposed tables:
-- - admin_settings (admin emails exposed)
-- - profiles (all user data exposed)
-- - clients (full client database exposed)
-- - client_research (AI research data exposed)
-- - contact_activities (activity logs exposed)
-- - email_sequences, email_sequence_steps, contact_sequence_enrollments
--
-- After running this migration, ROTATE YOUR SUPABASE ANON KEY

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CREATE ADMIN VERIFICATION FUNCTION
-- Used by all admin-only policies for consistent authorization
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is authenticated and has admin flag in profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is an admin. Used for RLS policies.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FIX admin_settings TABLE
-- Only admins should be able to read/update admin settings
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update admin settings" ON public.admin_settings;

-- New policy: Only authenticated admins can read admin settings
CREATE POLICY "Only admins can read admin settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- New policy: Only authenticated admins can update admin settings
CREATE POLICY "Only admins can update admin settings"
  ON public.admin_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.admin_settings FROM anon;
GRANT SELECT, UPDATE ON public.admin_settings TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FIX profiles TABLE
-- Users should only see their own profile, admins can see all
-- Public can only see limited info (display_name, avatar for community features)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- New policy: Authenticated users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

-- Keep existing insert/update policies (they're already properly scoped)
-- Users can only insert/update their own profile

-- For community features (showing skill creators), allow limited public access
-- This uses a view approach - we'll create a public_profiles view with limited columns
-- For now, revoke direct anon access to profiles
REVOKE SELECT ON public.profiles FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX clients TABLE
-- Anonymous: Only read portal-enabled clients (by slug lookup for portals)
-- Authenticated non-admin: No access
-- Admin: Full access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop ALL existing client policies
DROP POLICY IF EXISTS "Anyone can read enabled portals" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Anon users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Public can view enabled client portals" ON public.clients;

-- New policy: Anonymous users can only read portal-enabled clients
-- This is needed for the public portal pages
CREATE POLICY "Anon can read portal-enabled clients"
  ON public.clients FOR SELECT
  TO anon
  USING (portal_enabled = true);

-- New policy: Authenticated non-admins have no access
-- New policy: Admins have full access
CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Also allow admins to read (separate policy for clarity)
CREATE POLICY "Admins can read all clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Revoke excessive grants, set proper permissions
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.clients FROM authenticated;
GRANT SELECT ON public.clients TO anon;  -- Limited by RLS to portal_enabled only
GRANT ALL ON public.clients TO authenticated;  -- Limited by RLS to admins only

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. FIX client_research TABLE
-- Admin-only access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage client research" ON public.client_research;

-- New policy: Only admins can access client research
CREATE POLICY "Only admins can manage client research"
  ON public.client_research FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.client_research FROM anon;
GRANT ALL ON public.client_research TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. FIX contact_activities TABLE
-- Admin-only access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage contact activities" ON public.contact_activities;

-- New policy: Only admins can access contact activities
CREATE POLICY "Only admins can manage contact activities"
  ON public.contact_activities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.contact_activities FROM anon;
GRANT ALL ON public.contact_activities TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. FIX email_sequences TABLE
-- Admin-only access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage email sequences" ON public.email_sequences;

-- New policy: Only admins can access email sequences
CREATE POLICY "Only admins can manage email sequences"
  ON public.email_sequences FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.email_sequences FROM anon;
GRANT ALL ON public.email_sequences TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. FIX email_sequence_steps TABLE
-- Admin-only access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage email sequence steps" ON public.email_sequence_steps;

-- New policy: Only admins can access email sequence steps
CREATE POLICY "Only admins can manage email sequence steps"
  ON public.email_sequence_steps FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.email_sequence_steps FROM anon;
GRANT ALL ON public.email_sequence_steps TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. FIX contact_sequence_enrollments TABLE
-- Admin-only access
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can manage sequence enrollments" ON public.contact_sequence_enrollments;

-- New policy: Only admins can access sequence enrollments
CREATE POLICY "Only admins can manage sequence enrollments"
  ON public.contact_sequence_enrollments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke anon access completely
REVOKE ALL ON public.contact_sequence_enrollments FROM anon;
GRANT ALL ON public.contact_sequence_enrollments TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. FIX portal_analytics TABLE
-- Keep insert for anonymous (portal visitors tracking)
-- Read access only for admins
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert portal analytics" ON public.portal_analytics;
DROP POLICY IF EXISTS "Authenticated users can view portal analytics" ON public.portal_analytics;
DROP POLICY IF EXISTS "Anon can view portal analytics" ON public.portal_analytics;

-- New policy: Anonymous can insert (for tracking portal visits)
CREATE POLICY "Anon can insert portal analytics"
  ON public.portal_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

-- New policy: Only admins can read portal analytics
CREATE POLICY "Only admins can read portal analytics"
  ON public.portal_analytics FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- New policy: Only admins can delete/update (cleanup)
CREATE POLICY "Only admins can manage portal analytics"
  ON public.portal_analytics FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Set proper grants
REVOKE ALL ON public.portal_analytics FROM anon;
REVOKE ALL ON public.portal_analytics FROM authenticated;
GRANT INSERT ON public.portal_analytics TO anon;
GRANT ALL ON public.portal_analytics TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. CREATE PUBLIC PROFILES VIEW (for community features)
-- Limited view of profiles for showing skill creators
-- ═══════════════════════════════════════════════════════════════════════════

-- Create a view with only public information
CREATE OR REPLACE VIEW public.public_profile_info AS
SELECT
  id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;

-- This view uses SECURITY INVOKER by default, so RLS on profiles applies
-- But since we need anonymous access for community features, grant select
GRANT SELECT ON public.public_profile_info TO anon, authenticated;

COMMENT ON VIEW public.public_profile_info IS 'Limited public view of user profiles for community features (skill creators, etc.)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. AUDIT LOG (Future Enhancement Placeholder)
-- ═══════════════════════════════════════════════════════════════════════════

-- Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_table ON public.admin_audit_log(table_name);

-- RLS for audit log (admin read-only, system write)
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No direct insert/update/delete - use SECURITY DEFINER functions

GRANT SELECT ON public.admin_audit_log TO authenticated;

COMMENT ON TABLE public.admin_audit_log IS 'Audit trail of admin actions for security monitoring';

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY OF CHANGES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Tables secured (admin-only):
-- - admin_settings
-- - clients (full access)
-- - client_research
-- - contact_activities
-- - email_sequences
-- - email_sequence_steps
-- - contact_sequence_enrollments
-- - portal_analytics (read)
-- - admin_audit_log
--
-- Tables with limited public access:
-- - profiles (via public_profile_info view)
-- - clients (portal_enabled only for anon)
-- - portal_analytics (insert only for anon)
--
-- IMPORTANT: After running this migration:
-- 1. Test that portal pages still work for anonymous visitors
-- 2. Test that admin panel works for authenticated admins
-- 3. Verify anonymous users cannot access protected tables
-- 4. ROTATE YOUR SUPABASE ANON KEY
--
