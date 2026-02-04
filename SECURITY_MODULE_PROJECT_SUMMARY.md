# Client-Side Security Scanner & Compliance Engine

## Project Overview

A comprehensive security scanning system that runs entirely in the browser, detecting vulnerabilities, PII exposure, and configuration issues across single-page applications. Unlike server-side scanners, this solution examines the actual runtime environment—localStorage contents, DOM structure, loaded scripts, and security headers—providing visibility into client-side risks that traditional tools miss.

**Tech Stack:** TypeScript, React, Web Crypto API, Browser Security APIs

---

## Key Features Delivered

### 1. Multi-Check Security Scanner

A unified scanning engine that evaluates 15 security dimensions:

| Category | Checks |
|----------|--------|
| **Core Security** | API Key Exposure, Storage Patterns, Permissions, Session Security |
| **High Priority** | Cookie Security, Security Headers, Mixed Content, Subresource Integrity |
| **Medium Priority** | Form Security, Third-Party Script Inventory |
| **Defense in Depth** | Network Security, Service Workers, DOM Clobbering |

Each finding includes:
- Severity classification (Critical/High/Medium/Low/Info)
- Specific location or evidence
- Actionable remediation guidance

### 2. Multi-Page SPA Scanning

Traditional scanners see only one page. This system navigates the entire application:

- **33 routes organized into 8 logical groups** (Core, Skills, Workflows, Admin, etc.)
- Automatic navigation to each route
- Page-specific DOM analysis
- Smart deduplication of findings across pages
- Context restoration after scan completion

### 3. Weighted Security Scoring

A quantified security posture with letter grades:

```
Score Calculation:
  Start at 100 points
  - Critical finding: -25 points
  - High finding:     -15 points
  - Medium finding:   -5 points
  - Low finding:      -2 points

Grades: A (90+), B (80+), C (70+), D (60+), F (<60)
```

This provides executives with an at-a-glance security status while preserving detailed findings for engineers.

### 4. PII Detection & Redaction Engine

Comprehensive personally identifiable information handling:

**12 PII Types Detected:**
- Email addresses, phone numbers, SSNs, credit card numbers
- Physical addresses, names, dates of birth
- IP addresses, passport numbers, driver's licenses
- Bank account numbers, medical record identifiers

**Redaction Modes:**
- **Mask**: Replace with asterisks (John → J***)
- **Hash**: One-way transformation for referential integrity
- **Remove**: Complete deletion
- **Placeholder**: Replace with type label ([EMAIL])

Each detection includes a confidence score (0.0–1.0) based on pattern strength.

### 5. Device-Bound Encryption

Secure storage for sensitive data like API keys:

```
┌────────────────────────────────────────────────┐
│              Encryption Process                 │
├────────────────────────────────────────────────┤
│  Device Fingerprint + Master Password          │
│              ↓                                 │
│  PBKDF2 (100,000 iterations)                   │
│              ↓                                 │
│  AES-256-GCM Encryption                        │
│              ↓                                 │
│  Base64(salt + IV + ciphertext + authTag)      │
└────────────────────────────────────────────────┘
```

**Security Properties:**
- Keys are device-specific (won't decrypt on other machines)
- Authenticated encryption prevents tampering
- High iteration count resists brute-force attacks

### 6. Compliance Policy Framework

Configurable rules for organizational security requirements:

- **PII Detection Policies**: Warn or block when sensitive data is processed
- **Content Filtering**: Regex-based pattern blocking
- **Rate Limiting**: Prevent abuse patterns
- **Cost Controls**: Budget enforcement for AI operations
- **Approval Gates**: Require authorization for sensitive actions

### 7. Audit Trail System

Complete accountability for security-relevant events:

- Tracks 10+ action types (create, read, update, delete, execute, approve, etc.)
- Filterable by actor, resource type, action, date range
- Real-time callback notifications
- JSON export for compliance reporting
- Auto-cleanup after 10,000 entries

---

## Novel Technical Solutions

### Server Header Detection from the Browser

**The Problem:** Critical security headers like `Content-Security-Policy` and `X-Frame-Options` are delivered by the server, not visible in the DOM.

**The Solution:** Use HEAD requests to inspect response headers:

```typescript
// Detect server-delivered security headers
const response = await fetch(window.location.href, { method: 'HEAD' });
const csp = response.headers.get('Content-Security-Policy');
const xfo = response.headers.get('X-Frame-Options');
```

This technique reveals security configurations invisible to DOM-only inspection.

### Progressive Finding Deduplication

**The Problem:** Scanning 33 pages generates many duplicate findings (same vulnerability, different routes).

**The Solution:** Merge identical findings while preserving route context:

```
Before: 33 findings for "Missing CSP header" (one per page)
After:  1 finding with "Affects all 33 routes" annotation
```

This keeps reports actionable rather than overwhelming.

### Layered PII Pattern Matching

**The Problem:** Simple regex produces false positives. "123-45-6789" could be an SSN or a phone number.

**The Solution:** Multi-layer detection with confidence scoring:

1. **Format matching**: Does it match the pattern structure?
2. **Context analysis**: What surrounding text suggests about the data type?
3. **Overlap removal**: Prevent the same characters from triggering multiple detections
4. **Confidence weighting**: Rank findings by certainty

### Encryption Key Migration

**The Challenge:** Upgrading from weak encryption to strong encryption without losing user data.

**The Solution:** Transparent migration system:

1. Detect old format (XOR obfuscation) on read
2. Decrypt with legacy algorithm
3. Re-encrypt with AES-GCM
4. Mark format version for future reads

Users experience zero disruption while security improves.

---

## Security Checks in Detail

### API Key Exposure Detection

Scans for hardcoded secrets using provider-specific patterns:

| Provider | Pattern | Risk |
|----------|---------|------|
| Google | `AIza[0-9A-Za-z-_]{35}` | API abuse |
| OpenAI | `sk-[A-Za-z0-9]{48}` | Account compromise |
| Anthropic | `sk-ant-[A-Za-z0-9-]{95}` | Account compromise |
| GitHub | `ghp_[A-Za-z0-9]{36}` | Repository access |

Also checks localStorage for unencrypted sensitive values.

### Storage Pattern Analysis

Examines localStorage for security risks:

- **Size monitoring**: Warns when approaching 5MB browser limit
- **Stale data detection**: Identifies cached data older than 30 days
- **PII scanning**: Finds SSNs, credit cards, and other sensitive data in storage
- **Encryption verification**: Distinguishes encrypted from plaintext storage

### Cookie Security Audit

Evaluates cookie configurations:

- Missing `HttpOnly` flag (JavaScript-accessible cookies)
- Missing `Secure` flag (transmitted over HTTP)
- Missing `SameSite` attribute (CSRF vulnerability)
- Sensitive cookie names (session, auth, token) with inadequate protection

### Form Security Validation

Inspects form elements for vulnerabilities:

- Password fields without `autocomplete="off"` or `autocomplete="new-password"`
- Sensitive data submitted via GET (visible in URLs and logs)
- Forms submitting to HTTP endpoints
- Credit card fields allowing browser caching

---

## Architecture Decisions

### Severity Classification Framework

Findings are categorized by real-world impact:

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Direct data breach risk | Exposed API keys, unencrypted PII |
| **High** | Significant security gap | Missing security headers, XSS vectors |
| **Medium** | Defense-in-depth weakness | Missing SRI, suboptimal cookies |
| **Low** | Best practice deviation | Informational headers missing |
| **Info** | Observation only | Third-party script inventory |

### Scan State Management

Complex scanning operations managed through clear state transitions:

```
Idle → Scanning → [Per-Route Scanning] → Completed
                         ↓
                   Finding Aggregation
                         ↓
                   Score Calculation
                         ↓
                   History Update
```

### Modular Check Architecture

Each security check is an independent function:

```typescript
interface SecurityCheck {
  id: string;
  name: string;
  category: 'core' | 'high' | 'medium' | 'defense';
  run: () => Promise<SecurityFinding[]>;
}
```

This enables:
- Running checks in parallel
- Adding new checks without modifying existing code
- Selective scanning (e.g., quick scan vs. full scan)

---

## Business Impact

| Risk | Detection | Prevention |
|------|-----------|------------|
| API key theft | Scans localStorage and code for exposed secrets | Encrypted storage with device binding |
| PII leakage | 12-type detection with confidence scoring | Automatic redaction before storage |
| Session hijacking | Cookie security audit | Configuration recommendations |
| XSS attacks | CSP validation, DOM clobbering detection | Security header enforcement |
| Supply chain attacks | Third-party script inventory, SRI validation | Integrity hash requirements |

---

## Technical Metrics

- **15 security check categories**
- **33 SPA routes** scanned automatically
- **12 PII types** detected with confidence scoring
- **4 redaction modes** for sensitive data handling
- **2,248 lines** in core scanner library
- **100,000 PBKDF2 iterations** for key derivation

---

## Key Takeaways

1. **Client-Side Security Matters**: Server-side scanning misses localStorage, DOM, and runtime state. Browser-based scanning reveals what actually runs.

2. **Quantify Security Posture**: Letter grades make security status accessible to non-technical stakeholders. Weighted scoring reflects real-world impact.

3. **Deduplicate Intelligently**: Hundreds of identical findings obscure real issues. Smart aggregation keeps reports actionable.

4. **Migrate Gracefully**: Security upgrades shouldn't break user data. Transparent migration maintains continuity while improving protection.

5. **Detect Headers Creatively**: Security headers aren't in the DOM. HEAD requests reveal server configurations from client-side code.

6. **Score Confidence, Not Just Presence**: PII detection needs nuance. "Probably an SSN" is different from "Definitely an SSN."

---

*This project demonstrates advanced browser security techniques, cryptographic implementation, compliance engineering, and the design of developer tools that make security accessible and actionable.*
