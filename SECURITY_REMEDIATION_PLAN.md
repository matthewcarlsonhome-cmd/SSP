# Security Remediation Plan

## Executive Summary

A third-party security audit identified critical vulnerabilities in the application's Row-Level Security (RLS) policies. Multiple database tables are publicly accessible without proper authentication or authorization checks, exposing sensitive data including:

- Admin email addresses
- Client/prospect database (81 records)
- User profiles with admin flags
- AI-generated client research
- Contact activity history

This document outlines the remediation plan to secure the application.

---

## Critical Findings

### 1. Exposed Tables (via Supabase Anon Key)

| Table | Current Policy | Risk | Fix |
|-------|---------------|------|-----|
| `admin_settings` | `USING (true)` - Anyone can read | **CRITICAL** - Admin emails exposed | Admin-only access |
| `profiles` | `USING (true)` - Anyone can read | **HIGH** - All user profiles visible | Restrict to own profile + admins |
| `clients` | `USING (true)` for anon | **CRITICAL** - Full client DB exposed | Admin-only for full access |
| `client_research` | `USING (true)` for all | **HIGH** - AI research data exposed | Admin-only access |
| `contact_activities` | `USING (true)` for all | **HIGH** - Activity logs exposed | Admin-only access |
| `email_sequences` | `USING (true)` for all | **MEDIUM** - Campaign templates exposed | Admin-only access |
| `contact_sequence_enrollments` | `USING (true)` for all | **MEDIUM** - Enrollment data exposed | Admin-only access |

### 2. Root Causes

1. **Development Shortcuts**: Policies like `"Anon users can manage clients"` were marked as "Remove in production" but never removed
2. **Over-permissive Defaults**: Using `USING (true)` instead of proper authorization checks
3. **Missing Admin Verification**: No database-level function to verify admin status consistently
4. **No Security Headers**: Missing Content-Security-Policy, X-Frame-Options, etc.

---

## Remediation Steps

### Phase 1: Database Security (Immediate)

#### 1.1 Create Admin Verification Function
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### 1.2 Fix admin_settings Policies
- **Before**: Anyone can read
- **After**: Only admins can read/update

#### 1.3 Fix profiles Policies
- **Before**: Anyone can read all profiles
- **After**: Users can read own profile; admins can read all; public info only for non-admins

#### 1.4 Fix clients Policies
- **Before**: Anon users can do anything
- **After**:
  - Anonymous: Read only portal-enabled clients (for public portals)
  - Authenticated non-admin: No access
  - Admin: Full access

#### 1.5 Fix client_research, contact_activities, email_* Policies
- **Before**: Anyone can do anything
- **After**: Admin-only access

### Phase 2: Application Security

#### 2.1 Add Security Headers (netlify.toml)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

#### 2.2 Content Security Policy
```
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co"
```

### Phase 3: Post-Remediation

#### 3.1 Rotate Supabase Anon Key
After deploying fixes, rotate the exposed anon key in Supabase dashboard.

#### 3.2 Audit Logging
Add triggers to log admin actions for audit trail.

#### 3.3 Monitoring
Set up alerts for:
- Failed authentication attempts
- Admin access patterns
- Unusual data access patterns

---

## Implementation Files

1. `supabase/migrations/20260123_security_fix_admin_verification.sql` - Admin verification function
2. `supabase/migrations/20260123_security_fix_rls_policies.sql` - All RLS policy fixes
3. `netlify.toml` - Security headers

---

## Testing Checklist

After applying migrations:

- [ ] Anonymous users cannot read `admin_settings`
- [ ] Anonymous users cannot read full `clients` table (only portal-enabled slugs)
- [ ] Anonymous users cannot read `client_research`
- [ ] Anonymous users cannot read `contact_activities`
- [ ] Anonymous users cannot read `profiles` (except limited public info)
- [ ] Authenticated non-admin users have same restrictions
- [ ] Admin users have full access
- [ ] Portal pages still work for anonymous visitors
- [ ] Admin panel still functions correctly

---

## Estimated Impact

- **Portal Pages**: Will continue to work (portal-enabled clients remain accessible)
- **Admin Panel**: No change for authenticated admin users
- **API Access**: Unauthorized access will be blocked
- **Existing Data**: No data loss; only access control changes

---

## Post-Deployment Verification

Use these curl commands to verify the fix (should return empty or error):

```bash
# Should fail (admin_settings protected)
curl -s "https://[PROJECT].supabase.co/rest/v1/admin_settings" \
  -H "apikey: [ANON_KEY]"

# Should fail (profiles protected)
curl -s "https://[PROJECT].supabase.co/rest/v1/profiles" \
  -H "apikey: [ANON_KEY]"

# Should only return portal-enabled clients
curl -s "https://[PROJECT].supabase.co/rest/v1/clients" \
  -H "apikey: [ANON_KEY]"
```

---

## Timeline

1. **Immediate**: Apply database migration to fix RLS policies
2. **Same Day**: Add security headers to netlify.toml
3. **Within 24 Hours**: Rotate Supabase anon key
4. **Within 1 Week**: Implement audit logging

---

## Contact

For questions about this remediation plan, contact the security team or project maintainer.
