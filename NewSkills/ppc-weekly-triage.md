---
name: ppc-weekly-triage
description: Monday morning account triage and prioritization workflow for managing 45+ Google Ads accounts at the agency. Use this skill whenever the user needs to prioritize which accounts to work on, is starting their Monday workflow, wants to know which accounts are most at risk, needs to interpret anomaly alert emails, wants to build a weekly priority list, or asks "which accounts should I focus on today". Also use for mid-week check-ins or any time systematic account prioritization is needed across the full portfolio.
---

# agency Weekly Triage Workflow

## Purpose
Turn automated script alerts and dashboard data into a ranked action list in under 2 hours. The system scans; you decide.

---

## Step 1: Ingest Alert Emails (15 min)

### Script 1 — Anomaly Detector Email (Monday 6 AM)
Email subject: `[SSP Anomaly Alert] Week of MM/DD — X Critical, X Warning`

**How to read it:**
- **CRITICAL** = >40% change from 4-week rolling baseline in CPL, CPC, CTR, or Conv Rate
- **WARNING** = 20–40% change
- **INFO** = 10–20% change (monitor only)

For each CRITICAL flag, note:
- Which metric spiked or dropped
- Direction (up or down)
- Whether it's spend-related (budget issue) or performance-related (conversion/quality issue)

### Script 2 — Budget Pacing Email (Daily 8 AM)
Email subject: `[SSP Budget Pacing] MM/DD — X Over, X Under`

**How to read it:**
- **OVERPACE** (>110% MTD expected): Risk of exhausting budget before month end
- **UNDERPACE** (<85% MTD expected): Budget not being deployed, possibly losing impression share
- Cross-reference with Anomaly flags: an account that's both CRITICAL and OVERPACING is top priority

---

## Step 2: Dashboard Scan (10 min)

Open Looker Studio Portfolio Overview. Scan conditional formatting:

**Red flags to look for visually:**
- CPL column: any red cells (>25% above baseline)
- Conv Rate column: any red cells (>20% below baseline)  
- Budget Pace %: any accounts in red (<80% or >115%)
- WoW Change %: large negative swings in conversion volume

**What scripts miss (look for these manually):**
- Gradual 3-week decline that hasn't crossed threshold yet
- Accounts entering or exiting peak season (check seasonality calendar)
- Accounts with upcoming client calls that need clean data

---

## Step 3: Build Priority Matrix

After reviewing alerts and dashboard, classify every flagged account:

| Priority | Criteria | Max Accounts | Action |
|----------|----------|--------------|--------|
| P1 — Critical | Broken tracking + spend, OR CPL spike >40%, OR severe mispacing | 2–4 | Deep-dive today |
| P2 — Warning | CPL spike 20–40%, OR moderate mispacing, OR client call this week | 5–8 | Optimize Tue/Wed |
| P3 — Monitor | Minor anomaly, healthy but on rotation | Remaining | Regular rotation |

**Document your priority list in this format:**
```
ACCOUNT: [Name]
PRIORITY: P1/P2/P3
FLAG: [Anomaly type + metric]
HYPOTHESIS: [Why this is happening — before you look]
ACTION: [What you plan to do]
```

---

## Step 4: P1 Account Deep-Dive Protocol (20–30 min each)

For every P1 account, work through this checklist in order:

### Conversion Tracking Check (always first)
- [ ] Go to Tools > Conversions — are all conversion actions active?
- [ ] Check last conversion date — any gap > 3 days during normal traffic is a red flag
- [ ] Verify tags in Google Tag Assistant if available
- [ ] Check call tracking — is the number rotating correctly?

**If tracking is broken:** Stop optimizing. Log it. Submit brief to internal web team immediately. Note in Change Log.

### Budget & Pacing Check
- [ ] MTD spend vs. expected (days elapsed / 30 × monthly budget)
- [ ] Daily budget × 30.4 — does it match what client approved?
- [ ] Any budget increases/decreases this month?
- [ ] Is the account hitting daily budget cap by noon? (sign of underbidding or over-compression)

### Auction Insights
- [ ] Have competitors entered or exited the auction this week?
- [ ] Is impression share up or down?
- [ ] Is overlap rate with a specific competitor unusually high?

### Search Terms (quick scan)
- [ ] Any obvious junk in the last 7 days? (pool table, above ground kit, DIY, job listings)
- [ ] Any new irrelevant queries from a geo outside the service area?

### Performance Context
- [ ] What was weather like in client's market? (extreme cold/heat delays pool decisions)
- [ ] Any local events, holidays, or news that could affect search behavior?
- [ ] What was happening this same week last year?

---

## Step 5: Quick Win Actions (take these immediately)

These take < 5 minutes each and should be done during triage, not deferred:

- **Add obvious negative keywords** found in search terms scan
- **Pause a clearly broken ad** that has 0 conversions in 30+ days with significant impressions
- **Flag broken tracking** via brief to internal web team
- **Adjust budget pace** if >15% off (small increment, not a dramatic change)
- **Note a client call prep need** in the Reporting Draft Queue

---

## Step 6: Log Your Triage

Before closing triage, document in the Weekly Change Log:

```
DATE: [Monday date]
TRIAGE SUMMARY:
- Accounts reviewed: [total]
- P1 flagged: [list]
- P2 flagged: [list]  
- Immediate actions taken: [list each with account name]
- Deferred to Tue/Wed: [list]
- Notes for account managers: [any client-facing flags]
```

---

## Common Monday Scenarios

### Scenario: CPL spiked 35% last week
**Likely causes (in order of probability):**
1. Seasonal CPC increase (check auction insights — is everyone's CPC up?)
2. New competitor in auction (check impression share loss)
3. Match type drift pulling in broader, less-qualified traffic (check search terms)
4. Landing page issue — form broke or load time increased (check Conv Rate, not just CPL)
5. Tracking issue — conversions undercounting (check last conversion date)

### Scenario: Zero conversions in 5 days but normal spend
**This is almost always tracking.** Check in this order:
1. Conversion tag firing (Tag Assistant)
2. Call tracking number active
3. Form submission confirmation page URL hasn't changed
4. GA4 goal still importing correctly

### Scenario: Budget depleted by Day 18
**Options:**
1. Check if competitor exited — you may be winning more impression share at higher cost
2. Reduce target CPA slightly to let algorithm be more selective
3. Review ad schedule — are you running at full bid during low-conversion hours?
4. Flag to account manager: client may want to increase budget if leads are quality

### Scenario: Strong account suddenly has no impressions
**Check immediately:**
1. Account paused? (accidental or billing issue)
2. Daily budget set to $0 or $0.01?
3. All ads disapproved?
4. Geo-targeting accidentally set to wrong area?
5. Negative keyword accidentally added that's blocking all queries?
