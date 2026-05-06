# Security Scanner Replication Specification

Last updated: 2026-05-06

Purpose: describe the Security Scanner currently implemented in the SkillEngine Admin Control Panel with enough implementation detail to rebuild the same base scanner in another React/TypeScript web application, then define a professional roadmap for turning it into a higher-grade web application security testing platform.

Scope: this specification is for defensive testing of applications you own or are explicitly authorized to test. The base scanner is a client-side/admin-console scanner. The recommended professional extensions add CI, server-side, browser-automation, and deployment-environment testing so the platform can detect issues that browser JavaScript alone cannot see.

## 1. Product Goal

Build an admin-only Security Scanner that helps application owners quickly answer:

- Are API keys, DB credentials, tokens, or other secrets exposed in browser storage, cookies, global variables, HTML, bundles, or session state?
- Are localStorage, IndexedDB, cookies, and sessions handling sensitive data safely?
- Are security headers and browser policies present and strong enough?
- Are forms, scripts, mixed-content resources, redirects, service workers, and DOM patterns creating avoidable attack surface?
- How did the security posture change across releases?
- Which findings are critical enough to block deployment?

The base scanner should replicate SkillEngine's current functionality:

- run a single-page security scan from the Admin Control Panel;
- optionally navigate across a manifest of SPA routes and run DOM checks per page;
- show progress, findings, severity counts, score/grade, history, filters, and CSV export;
- store recent scan history locally;
- support cancellation through `AbortController`;
- provide clear remediation text for every finding.

## 2. Recommended Architecture

### Frontend Modules

```text
src/
  admin/
    security/
      securityScanner.ts
      SecurityScannerPanel.tsx
      securityScannerTypes.ts
      scannerChecks/
        apiKeys.ts
        storage.ts
        permissions.ts
        session.ts
        environment.ts
        cookies.ts
        headers.ts
        content.ts
        forms.ts
        scripts.ts
        network.ts
        serviceWorkers.ts
        domSecurity.ts
      routeManifest.ts
      scoring.ts
      csv.ts
```

SkillEngine currently keeps most scanner logic in one file, `lib/admin/securityScanner.ts`, and the UI in `components/SecurityScannerPanel.tsx`. For a new app, split checks into separate modules from the start. The public API can remain small:

```ts
runSecurityScan(options, onProgress, abortSignal): Promise<ScanResult>
runMultiPageScan(options, onProgress, abortSignal): Promise<ScanResult>
getRecentScans(limit): ScanResult[]
getScanById(scanId): ScanResult | undefined
clearScanHistory(): void
exportFindingsToCSV(findings): string
calculateSecurityScore(summary): SecurityScore
```

### Optional Backend Modules For Professional Mode

```text
server/
  security/
    scanController.ts
    bundleSecretScanner.ts
    headerScanner.ts
    cookieScanner.ts
    dependencyScanner.ts
    sbomScanner.ts
    corsScanner.ts
    authConfigScanner.ts
    databaseExposureScanner.ts
    reportStore.ts
```

The client-side scanner is excellent for browser-observable problems. It cannot reliably see HttpOnly cookies, server environment variables, backend-only DB credentials, source maps not loaded by the browser, RLS misconfiguration, dependency CVEs, or API endpoint authorization flaws. Professional-grade parity requires adding backend and CI scanners.

## 3. Data Model

### Scan Severity

```ts
export type ScanSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
```

Severity meanings:

- `critical`: likely exploitable credential exposure, insecure production transport, insecure form credential submission, serious mixed-content script execution.
- `high`: admin/session mismatch, missing clickjacking protection, sensitive JS-readable cookie, open redirect to external domain.
- `medium`: suspicious sensitive data in storage, weak/missing policy, unknown third-party script, sensitive autocomplete risk.
- `low`: hygiene issue, stale data, missing convenience hardening, too many inline handlers.
- `info`: posture note, positive control, development context, manual review reminder.

### Scan Category

```ts
export type ScanCategory =
  | 'api_keys'
  | 'storage'
  | 'permissions'
  | 'session'
  | 'environment'
  | 'configuration'
  | 'cookies'
  | 'headers'
  | 'content'
  | 'forms'
  | 'network'
  | 'scripts';
```

### Finding

```ts
export interface SecurityFinding {
  id: string;
  category: ScanCategory;
  severity: ScanSeverity;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  route?: string;
}
```

Implementation notes:

- `id` should use `crypto.randomUUID()`.
- `detectedAt` should be ISO timestamp.
- `route` is only populated for multi-page/page-specific findings.
- Never include raw secret values in findings. Redact or report only the storage key, source, provider type, and first/last 4 characters if absolutely needed.

### Scan Result

```ts
export interface ScanResult {
  id: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  status: 'completed' | 'failed' | 'cancelled';
  error?: string;
  multiPage?: boolean;
  scannedRoutes?: string[];
}
```

### Progress

```ts
export interface ScanProgress {
  phase: string;
  currentCheck: string;
  completed: number;
  total: number;
  percentage: number;
  currentRoute?: string;
}
```

### Options

```ts
export interface SecurityScannerOptions {
  includeApiKeys?: boolean;
  includeStorage?: boolean;
  includePermissions?: boolean;
  includeSession?: boolean;
  includeEnvironment?: boolean;
  includeConfiguration?: boolean;
  includeCookies?: boolean;
  includeHeaders?: boolean;
  includeMixedContent?: boolean;
  includeSRI?: boolean;
  includeForms?: boolean;
  includeThirdPartyScripts?: boolean;
  includeNetwork?: boolean;
  includeServiceWorkers?: boolean;
  includeDOMSecurity?: boolean;
}
```

Default every option to `true`.

## 4. Route Manifest

The base scanner supports multi-page scans through a static SPA route manifest:

```ts
export interface RouteEntry {
  path: string;
  label: string;
  group: string;
}
```

Replication rules:

- Include every static route in the app.
- Exclude parameterized routes unless test fixture IDs are available.
- Group routes for UI selection.
- In a hash-router app, navigation uses `window.location.hash = '#' + path`.
- In a browser-router app, inject a navigation adapter such as `navigate(path)` from the router.

Example:

```ts
export const ROUTE_MANIFEST: RouteEntry[] = [
  { path: '/', label: 'Home', group: 'Core' },
  { path: '/dashboard', label: 'Dashboard', group: 'Core' },
  { path: '/settings', label: 'Settings', group: 'Utility' },
  { path: '/admin', label: 'Admin Panel', group: 'Admin' },
];
```

## 5. Storage And History

SkillEngine stores scan history in localStorage:

```ts
const STORAGE_KEY = 'skillengine_security_scans';
```

Replication behavior:

- `getScanHistory()` reads and parses localStorage JSON.
- `saveScanHistory(scans)` writes only the most recent 20 scans.
- `getRecentScans(limit = 10)` returns the newest N.
- `getScanById(id)` finds one scan.
- `clearScanHistory()` removes the storage key.
- Catch and log all storage errors.

Professional upgrade:

- Store reports server-side per environment, branch, commit SHA, release, actor, and target URL.
- Keep baselines so teams can compare "new findings" vs "accepted existing risk."
- Add resolution lifecycle: open, accepted, false positive, fixed, reopened.

## 6. Server Header Detection

The base scanner performs a `HEAD` request to the current page to inspect server-delivered headers:

```ts
fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
```

Cache this result for one scan:

```ts
interface ServerHeaders {
  csp: string | null;
  xFrameOptions: string | null;
  referrerPolicy: string | null;
  permissionsPolicy: string | null;
  strictTransportSecurity: string | null;
  xContentTypeOptions: string | null;
  fetched: boolean;
}
```

Use this cache in header, clickjacking, and environment checks. Clear it before each scan.

Professional upgrade:

- Fetch headers for every route and every asset class.
- Use server-side fetch to avoid browser CORS visibility limits.
- Validate HSTS preload readiness, CSP strictness, COOP, COEP, CORP, cache-control, cross-origin policies, and Set-Cookie flags.

## 7. Base Check Inventory

### 7.1 API Key Exposure

Function: `checkApiKeyExposure()`

Current behavior:

- Iterate over `localStorage`.
- Flag known plain text secret patterns:
  - Google API key: `^AIza[0-9A-Za-z_-]{35}$`
  - OpenAI key: `^sk-[a-zA-Z0-9]{48,}$`
  - Anthropic key: `^sk-ant-[a-zA-Z0-9_-]{90,}$`
  - GitHub PAT: `^ghp_[a-zA-Z0-9]{36}$`
  - GitHub OAuth token: `^gho_[a-zA-Z0-9]{36}$`
  - Slack bot token: `^xoxb-[0-9A-Za-z-]+$`
  - Slack user token: `^xoxp-[0-9A-Za-z-]+$`
- Identify sensitive storage keys whose names include:
  - `api`
  - `key`
  - `secret`
  - `token`
  - `password`
  - `credential`
- If a known key pattern is found unencrypted, emit `critical`.
- If a known key is detected with encryption marker, emit `info`.
- If a suspicious key has a long non-JSON value, emit `medium`, except known safe app-prefixed keys.

Recommended additions:

- Scan `sessionStorage`, not only `localStorage`.
- Scan in-memory globals on `window`.
- Scan rendered HTML, script tag text, meta tags, data attributes, and comments.
- Fetch and scan JS bundles and source maps for credential patterns.
- Include provider patterns for Supabase service role keys, Firebase, Stripe, SendGrid, Mailgun, AWS, Azure, GCP, Vercel, Netlify, Resend, Twilio, Clerk, Auth0, PostHog, Sentry, and database URLs.
- Use entropy-based detection with allowlists to catch unknown secrets.
- Redact all findings.

### 7.2 Storage Patterns

Function: `checkStoragePatterns()`

Current behavior:

- Compute total localStorage size.
- Emit `medium` if localStorage exceeds 4 MB.
- Check stale cache/temp/draft data:
  - key contains `_cache`, `_temp`, or `_draft`;
  - JSON has `createdAt` or `timestamp`;
  - age is greater than 30 days;
  - emit `low`.
- Check user data keys:
  - key contains `user`, `profile`, `account`, or `session`;
  - parsed JSON has `email`, `phone`, `ssn`, or `creditCard`;
  - emit `medium` for general PII and `critical` for SSN/credit card.

Recommended additions:

- Scan sessionStorage with same rules.
- Scan IndexedDB object stores asynchronously and wait for results.
- Flag JWTs and refresh tokens stored outside secure HttpOnly cookies.
- Flag unbounded cache keys, large blobs, exports, and files stored client-side.
- Add data classification labels: public, internal, confidential, regulated.

### 7.3 Permissions Configuration

Function: `checkPermissions()`

Current behavior:

- Check `skillengine_admin_emails`.
- Missing admin list: `high`.
- Empty admin list: `high`.
- One admin user: `low`.
- Multiple admins: `info`.
- Invalid JSON: `medium`.
- Check `skillengine_role_configs`.
- If free tier has unlimited daily/monthly skill runs, emit `medium`.

Recommended additions:

- Move admin authorization checks server-side.
- Test RBAC/ABAC policy from actual authenticated roles.
- Add "break glass" admin review.
- Detect client-side-only admin gates.
- Verify route protection and API protection separately.

### 7.4 Session Security

Function: `checkSession()`

Current behavior:

- Inspect `skillengine_current_user`.
- If `lastLoginAt` is older than 30 days, emit `low`.
- If user has `isAdmin` but email is not in configured admin list, emit `high`.
- Invalid current user JSON: `medium`.
- If localStorage has keys starting with `sb-` or containing `supabase`, emit `info` noting Supabase session entries.

Recommended additions:

- Decode JWT header/payload locally and check expiry, issuer, audience, role claims, and algorithm.
- Flag tokens in sessionStorage/localStorage.
- Verify logout clears all token-bearing stores.
- Verify refresh token rotation where applicable.
- Add session fixation and privilege downgrade checks.

### 7.5 Environment And Configuration

Function: `checkEnvironment()`

Current behavior:

- Detect development mode by:
  - `process.env.NODE_ENV === 'development'`;
  - hostname `localhost`;
  - hostname `127.0.0.1`.
- Development mode emits `info`.
- Non-development HTTP emits `critical`.
- Global `window` SDK objects named `supabase`, `firebase`, `aws`, or `stripe` emit `medium`.
- Missing CSP in meta tag and server headers in production emits `medium`.
- Server-delivered CSP emits `info`.

Recommended additions:

- Detect exposed build metadata: commit SHA, env names, feature flags, internal URLs.
- Scan `import.meta.env` exposures and public env var prefixes.
- Flag production debug routes, source maps, stack traces, and verbose logging.
- Add environment-specific expected controls.

### 7.6 Cookie Security

Function: `checkCookieSecurity()`

Current behavior:

- Read `document.cookie`.
- No JavaScript-readable cookies: emit `info`.
- Sensitive cookie names containing `session`, `auth`, `token`, `jwt`, or `user` emit `high`, because JS visibility implies missing HttpOnly.
- Any JS-readable cookies emit `low`.
- On HTTPS pages with cookies, emit `medium` recommending SameSite review.

Important limitation:

- Browser JavaScript cannot inspect HttpOnly cookies or Set-Cookie attributes. This check only sees cookies that are already JavaScript-readable.

Professional upgrade:

- Use server-side HTTP client or Playwright network events to inspect Set-Cookie.
- Validate `HttpOnly`, `Secure`, `SameSite`, prefix rules `__Host-` / `__Secure-`, path/domain scope, expiration, and session fixation behavior.

### 7.7 IndexedDB Security

Function: `checkIndexedDBSecurity()`

Current behavior:

- If `window.indexedDB.databases` exists, emit `info` recommending manual review.
- Attempt to open common sensitive DB names:
  - `firebaseLocalStorage`
  - `supabase`
  - `auth`
  - `localforage`
- If stores exist, emit `medium`.

Known implementation limitation:

- The current function starts async IndexedDB calls but returns findings synchronously, so late findings may not be included in the scan result.

Professional upgrade:

- Make storage checks async.
- Enumerate databases and object stores.
- Sample records safely.
- Redact sensitive values.
- Detect tokens, secrets, PII, and large unencrypted payloads.

### 7.8 Mixed Content

Function: `checkMixedContent()`

Current behavior:

- If page is not HTTPS, emit `info` and skip.
- On HTTPS:
  - HTTP script: `critical`.
  - HTTP stylesheet: `high`.
  - HTTP images: aggregate `medium`.
  - HTTP iframes: `high`.
- If no mixed content, emit `info`.

Professional upgrade:

- Inspect CSS `url(...)` resources.
- Inspect dynamic network requests.
- Capture browser console mixed-content errors with Playwright.

### 7.9 Clickjacking Protection

Function: `checkClickjackingProtection()`

Current behavior:

- Check CSP meta for `frame-ancestors`.
- Check X-Frame-Options meta.
- Check server headers for `X-Frame-Options` or CSP `frame-ancestors`.
- If none found, emit `high`.
- Server-delivered protection emits `info`.
- Meta-based frame protection emits `info` with caution.

Professional upgrade:

- Prefer server CSP `frame-ancestors`.
- Warn that `frame-ancestors` cannot be enforced from meta in many cases.
- Validate allowlist values and block wildcard/overly broad origins.

### 7.10 Subresource Integrity

Function: `checkSRI()`

Current behavior:

- External `script[src]` without `integrity`: `medium`.
- External stylesheet without `integrity`: `low`.
- If all external resources are covered or none exist, emit `info`.

Professional upgrade:

- Verify hash algorithm and crossorigin attributes.
- Flag stale vulnerable CDN libraries.
- Recommend self-hosting critical dependencies.

### 7.11 Security Headers

Function: `checkSecurityHeaders()`

Current behavior:

- Check Referrer Policy through meta tag or server header.
- Missing referrer policy: `medium`.
- Weak `unsafe-url` or `no-referrer-when-downgrade`: `medium`.
- Configured policy: `info`.
- Check Permissions-Policy / Feature-Policy through meta or server header.
- Missing Permissions-Policy: `low`.
- Server Permissions-Policy: `info`.

Professional upgrade:

- Add checks for:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Embedder-Policy`
  - `Cross-Origin-Resource-Policy`
  - `Cache-Control` for sensitive pages
  - `X-Permitted-Cross-Domain-Policies`
- Score CSP strictness, not only presence.

### 7.12 Form Security

Function: `checkFormSecurity()`

Current behavior:

- Password fields without autocomplete emit `low`.
- Sensitive input names containing password/secret/token/api/key/ssn/credit without `autocomplete="off"` and not password type emit `medium`.
- Sensitive forms using GET emit `high`.
- HTTPS page with form action using HTTP emits `critical`.
- If no findings, emit `info`.

Professional upgrade:

- Detect missing CSRF tokens for state-changing forms.
- Validate form target origin.
- Detect password fields without strength, breach, or confirmation controls where applicable.
- Detect hidden fields containing secrets or tokens.

### 7.13 Third-Party Scripts

Function: `checkThirdPartyScripts()`

Current behavior:

- Inventory external scripts whose hostname differs from current host and is not localhost.
- Known safe list includes common CDNs and analytics domains.
- Any third-party scripts emit `info`.
- Scripts from unknown domains emit `medium`.
- More than 10 inline scripts emit `low`.

Professional upgrade:

- Maintain an approved vendor inventory.
- Diff vendor list across releases.
- Detect supply-chain risk from abandoned packages and vulnerable CDN URLs.
- Link each script to CSP and SRI status.

### 7.14 Network Security

Function: `checkNetworkSecurity()`

Current behavior:

- On HTTPS, emit `info` reminding to use `wss://` WebSockets.
- Check URL parameters for potential open redirect names:
  - `redirect`
  - `return`
  - `returnUrl`
  - `next`
  - `url`
  - `goto`
  - `destination`
  - `redir`
- If redirect param contains external host, emit `high`.

Professional upgrade:

- Use Playwright to intercept requests and identify:
  - insecure endpoints;
  - auth tokens in query strings;
  - third-party leakage;
  - missing credentials mode expectations;
  - unexpected CORS behavior.

### 7.15 Service Workers

Function: `checkServiceWorkers()`

Current behavior:

- If service workers are available, call `navigator.serviceWorker.getRegistrations()`.
- If registrations exist, emit `info`.

Known implementation limitation:

- The check is async but returns synchronously, so findings may not be captured reliably.

Professional upgrade:

- Make the check async.
- Fetch and inspect service worker scripts.
- Flag caching of authenticated API responses, secrets, PII, and stale HTML shells.

### 7.16 DOM Security

Function: `checkDOMSecurity()`

Current behavior:

- Detect IDs/names that may clobber important globals:
  - `document`, `window`, `location`, `navigator`, `history`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `eval`, `Function`, `Array`, `Object`, `String`, `Number`, `console`, `alert`, `confirm`, `prompt`.
- If found, emit `medium`.
- Detect inline event handlers:
  - `[onclick]`, `[onerror]`, `[onload]`, `[onmouseover]`.
- If found, emit `low`.

Professional upgrade:

- Detect dangerous sinks:
  - `innerHTML`
  - `outerHTML`
  - `insertAdjacentHTML`
  - `document.write`
  - `eval`
  - `new Function`
- Add static source scanning for those patterns.
- Add runtime mutation-observer checks for injected scripts.

## 8. Scan Orchestration

### Single Page Scan

Algorithm:

1. Set `startedAt` and `startTime`.
2. Clear header cache.
3. Fetch server headers.
4. Build enabled check list from options.
5. For each check:
   - stop if `abortSignal.aborted`;
   - call `onProgress`;
   - wait briefly to allow UI updates;
   - run check;
   - append findings.
6. Emit completion progress.
7. Summarize severity counts.
8. Save result to history.
9. Return result.
10. On error, save failed/cancelled result with partial findings.

Default check order:

```ts
[
  'API Keys',
  'Storage Patterns',
  'IndexedDB Security',
  'Permissions',
  'Session Security',
  'Environment',
  'Cookie Security',
  'Security Headers',
  'Clickjacking Protection',
  'Mixed Content',
  'Subresource Integrity',
  'Form Security',
  'Third-Party Scripts',
  'Network Security',
  'Service Workers',
  'DOM Security',
]
```

### Multi-Page Scan

Global checks run once:

- API keys
- storage
- IndexedDB
- permissions
- session
- environment
- cookies
- headers
- clickjacking
- network
- service workers

Page-specific checks run on every route:

- mixed content
- SRI
- form security
- third-party scripts
- DOM security

Algorithm:

1. Save original route.
2. Fetch headers once.
3. Run global checks.
4. For each selected route:
   - navigate;
   - wait for render;
   - run page checks;
   - tag findings with route.
5. Restore original route.
6. Deduplicate findings by category, severity, title, and description.
7. Merge route info into duplicates.
8. Save scan.

## 9. Scoring

SkillEngine scoring:

```ts
deductions =
  critical * 25 +
  high * 15 +
  medium * 5 +
  low * 2;

score = Math.max(0, 100 - deductions);
```

Grades:

- `A`: score >= 90, "Excellent security posture"
- `B`: score >= 80, "Good security with minor improvements needed"
- `C`: score >= 70, "Acceptable security with notable concerns"
- `D`: score >= 60, "Below average security, action recommended"
- `F`: score < 60, "Critical security issues require immediate attention"

Professional upgrade:

- Add weighted categories by asset criticality.
- Add confidence score.
- Add exploitability and business impact.
- Separate "positive controls" from findings so info items do not inflate noise.
- Support policy gates, for example: fail deployment on any critical or new high.

## 10. Admin Panel UI

Replicate these UI sections:

### Header

- Title: Security Scanner.
- Subtitle: scan for security vulnerabilities and configuration issues.
- History button with count.
- Export button when a scan result exists.

### History Panel

- Recent scans list.
- Grade badge.
- Status: completed, failed, cancelled.
- Multi-page badge with pages scanned.
- Completed timestamp.
- Severity summary.
- Clear history action.

### Scan Options

Group checkboxes:

Core Security:

- API Keys
- Storage and IndexedDB
- Permissions
- Session Security
- Environment
- Configuration

High Priority:

- Cookie Security
- Security Headers
- Mixed Content
- Subresource Integrity

Medium Priority:

- Form Security
- Third-Party Scripts

Defense In Depth:

- Network and Redirects
- Service Workers
- DOM Security

### Multi-Page Mode

- Toggle multi-page scan.
- Route selection button showing selected/total.
- Route group selection.
- Select all / select none.
- Informational note explaining global checks vs route-specific checks.

### Run Controls

- Run Security Scan button.
- Scan N Pages button in multi-page mode.
- Stop Scan button while running.
- Progress bar with current check and percentage.
- Current route display during multi-page scan.

### Results

- Score card with grade.
- Summary counts by severity.
- Filters:
  - severity;
  - category;
  - route when multi-page.
- Findings list:
  - severity badge;
  - category badge;
  - route badge;
  - title;
  - short description;
  - expandable details;
  - location;
  - recommendation;
  - detected timestamp.

### Empty State

- Shield icon.
- "No Scan Results."
- Run button.

## 11. CSV Export

When findings have routes, include route column:

```text
Severity,Category,Route,Title,Description,Location,Recommendation,Detected At,Resolved
```

Otherwise:

```text
Severity,Category,Title,Description,Location,Recommendation,Detected At,Resolved
```

CSV rules:

- Quote every cell.
- Escape double quotes.
- Use ISO timestamps.
- Do not export raw secret values.

## 12. Professional-Grade Enhancements

These are the highest-value additions if you want this to compare with expensive testing platforms.

### 12.1 Secret Exposure Testing

Add scanners for:

- `localStorage`
- `sessionStorage`
- IndexedDB
- Cache Storage
- cookies visible to JS
- in-memory `window` globals
- rendered HTML
- JavaScript bundles
- source maps
- network request URLs, headers, and bodies
- service worker caches
- build artifacts in `dist`
- Git history and current working tree

Detection:

- provider-specific regexes;
- entropy detection;
- keyword proximity;
- JWT parsing;
- database URL parsing;
- allowlist and false-positive suppression;
- redaction-first reporting.

Important DB patterns:

- PostgreSQL URL: `postgres://`, `postgresql://`
- MySQL URL: `mysql://`
- MongoDB URL: `mongodb://`, `mongodb+srv://`
- Redis URL: `redis://`, `rediss://`
- Supabase anon key and service role key patterns
- Firebase config and private service account JSON
- Prisma connection strings
- Neon, PlanetScale, Railway, Render, Vercel Postgres URLs

### 12.2 Browser Automation Scanner

Use Playwright in CI and optionally from a server-side worker:

- login with test account;
- crawl route manifest;
- collect console errors;
- collect network requests;
- inspect response headers;
- inspect Set-Cookie attributes;
- inspect local/session storage after every route;
- capture HAR;
- detect API keys in request payloads;
- detect auth tokens in query strings;
- detect broken auth redirects;
- screenshot evidence for findings.

### 12.3 API And Auth Testing

Add endpoint security checks:

- unauthenticated access to protected endpoints;
- user A can access user B resource;
- admin endpoint accessible to non-admin;
- missing CSRF protection;
- permissive CORS;
- missing rate limits;
- IDOR probes with fixture IDs;
- stale JWT acceptance;
- privilege escalation through client-side role flags.

### 12.4 Supabase And Database Security

For Supabase apps, add a dedicated scanner:

- RLS enabled on all public tables.
- Policies exist for select/insert/update/delete.
- anon role cannot read admin tables.
- service role key not present in client bundle.
- storage buckets are not public unless explicitly intended.
- RPC functions using `SECURITY DEFINER` have safe search path and authorization.
- Edge Functions do not expose secrets in responses.
- public env values only include anon-safe keys.

### 12.5 Header And Policy Analyzer

Add full policy scoring:

- CSP strictness and nonce/hash usage.
- unsafe-inline / unsafe-eval detection.
- frame-ancestors enforcement.
- HSTS max-age and includeSubDomains.
- Referrer-Policy strength.
- Permissions-Policy coverage.
- X-Content-Type-Options.
- COOP/COEP/CORP.
- cache-control for authenticated pages.

### 12.6 Dependency And Supply Chain

Integrate:

- `npm audit` or package manager equivalent.
- OSV API.
- Snyk optional.
- Semgrep rules.
- Trivy/Grype for containers.
- SBOM generation.
- license policy.
- third-party script/vendor allowlist.

### 12.7 Reporting And Workflow

Add:

- persistent scan projects;
- environments: local, preview, staging, production;
- baselines and diff views;
- accepted-risk workflow;
- false-positive suppression with expiry;
- evidence attachments;
- remediation checklist;
- owner assignment;
- severity SLA;
- GitHub issue creation;
- PR comment summary;
- deployment gate status.

### 12.8 Scheduled And Continuous Scanning

Add:

- scheduled nightly scans;
- scan on deploy preview;
- scan on production release;
- scan on dependency update;
- scan when headers or route manifest changes;
- webhook alerting to email/Slack.

## 13. Implementation Plan For Codex

Use this sequence in a new web app.

### Pass 1: Base Scanner Library

Create:

- `securityScannerTypes.ts`
- `routeManifest.ts`
- `scoring.ts`
- `csv.ts`
- `securityScanner.ts`

Implement:

- finding/result/progress/options types;
- route manifest;
- local scan history;
- server header cache;
- all base checks described in section 7;
- single-page orchestration;
- multi-page orchestration;
- deduplication;
- CSV export;
- scoring.

Tests:

- API key regexes detect expected providers.
- Plain text secrets become critical.
- Encrypted/known-safe keys do not become critical.
- Storage size and stale data rules work.
- Score formula works.
- Dedup merges route findings.
- CSV escapes quotes.

### Pass 2: Admin UI

Create `SecurityScannerPanel.tsx`.

Implement:

- grouped options;
- history panel;
- route selector;
- run/stop controls;
- progress;
- score card;
- filters;
- expandable findings;
- export.

Design tips:

- Use dense admin layout, not a marketing page.
- Use severity color consistently.
- Make critical/high findings visually obvious.
- Keep checkboxes grouped by operational priority.
- Do not bury recommendations; show them in expanded details.
- Add a "copy remediation" action later.

### Pass 3: Async Storage Fix

Convert all checks to support async:

```ts
type SecurityCheck = () => SecurityFinding[] | Promise<SecurityFinding[]>;
```

Then fix:

- IndexedDB enumeration.
- Service worker registrations.
- Cache Storage inspection.
- network/header checks.

### Pass 4: Pro Scanner Worker

Add server or CI scanner:

- Playwright route crawl.
- network/HAR collection.
- response header and Set-Cookie analysis.
- bundle and source-map secret scanner.
- sessionStorage and IndexedDB after navigation.
- authenticated test account support.

### Pass 5: Persistent Reports

Add database tables:

```sql
security_projects
security_scan_runs
security_findings
security_finding_events
security_baselines
security_suppressions
security_scan_artifacts
```

Store:

- target URL;
- environment;
- commit SHA;
- branch;
- actor;
- scanner version;
- findings;
- evidence;
- status lifecycle.

### Pass 6: CI And Deployment Gates

Add:

- CLI command: `security-scan --target <url> --baseline <id>`.
- JSON output.
- SARIF output.
- GitHub Actions workflow.
- PR comment summary.
- fail conditions.

Example fail policy:

```json
{
  "failOnNewCritical": true,
  "failOnNewHigh": true,
  "maxMedium": 5,
  "allowAcceptedRisk": true
}
```

## 14. Critical Design Warnings

- A browser-only scanner cannot prove server secrets are safe. It can only prove they are not visible from that browser context.
- A browser-only scanner cannot inspect HttpOnly cookie flags.
- Client-side admin checks must not be treated as access control. Enforce admin authorization server-side.
- Never send discovered secrets to an LLM or third-party API.
- Redact secrets before storage, export, logging, or UI rendering.
- Run active/probing tests only against owned or explicitly authorized systems.
- Keep destructive tests disabled by default.

## 15. Definition Of Done

Base scanner is complete when:

- all base checks run from the admin panel;
- single-page and multi-page scans work;
- scan cancellation works;
- history stores the last 20 scans;
- CSV export works;
- scoring matches SkillEngine formula;
- findings include severity, category, location, recommendation, timestamp, and route when applicable;
- no raw secrets are displayed or exported;
- tests cover key detection, scoring, deduplication, CSV, and at least one finding in every category.

Professional scanner is complete when:

- browser, server, CI, dependency, and deployment scans are unified into one reporting model;
- authenticated route crawling is supported;
- bundle/source-map secret scanning exists;
- Set-Cookie and security headers are evaluated server-side;
- Supabase/database exposure checks exist where relevant;
- reports persist by project/environment/commit;
- findings support lifecycle, baselines, suppressions, evidence, and owner assignment;
- deployment gates can fail on new critical/high findings.
