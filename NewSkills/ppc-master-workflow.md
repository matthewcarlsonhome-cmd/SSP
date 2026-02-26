---
name: ppc-master-workflow
description: The master weekly and monthly operating cadence for managing 45+ Google Ads accounts at your agency. Use this skill whenever the user asks about their weekly schedule, what to do on any given day, how to structure their work week, what the Monday/Wednesday/Friday cadence looks like, or needs a reminder of the full workflow. Also triggers for questions like "what should I be doing this week", "what's my Monday workflow", "walk me through the weekly process", or "how do I manage all the accounts". This is the hub skill — it points to all other agency skills.
---

# agency Master Weekly Workflow

## The Mental Model

You manage 45+ accounts. The system does the scanning; you do the thinking. Your week has three modes:
- **Monday**: Triage — the data tells you where to go
- **Tue–Thu**: Execute — optimize, call prep, client calls
- **Friday**: Document — close the loop, set up Monday

Never let documentation slip to "later." A change not logged is a change that can't be defended.

---

## MONDAY: Triage & Prioritize (2–2.5 hrs)

| Time | Action | Tool/Source |
|------|--------|-------------|
| 8:00 AM | Review anomaly alert email — note Critical vs. Warning flags | Script 1 email |
| 8:10 AM | Review budget pacing email — cross-reference with anomaly flags | Script 2 email |
| 8:20 AM | Scan Portfolio Overview dashboard — visual confirmation, look for gradual trends scripts miss | Looker Studio |
| 8:30 AM | Review Recommendations Audit email — triage Critical and High items, log all decisions | Script 7 email |
| 8:40 AM | (Biweekly) Review Search Term Waste report — add negatives to highest-waste accounts | Script 3 email |
| 9:00 AM | Deep-dive top 3–5 flagged accounts — auction insights, landing pages, tracking status, seasonal context | Google Ads UI |
| 9:30 AM | Document all changes in Weekly Change Log — every entry, every account | Change Log sheet |
| 10:00 AM | Build priority list for Tue–Thu — which accounts need attention, which calls need prep | Priority tracker |

**Accounts to prioritize (in order):**
1. Any with broken conversion tracking (spend but zero conversions)
2. Any with severe budget mispacing (>20% over or under MTD expected)
3. Any with CPL spike >25% vs. 4-week rolling baseline
4. Any with client call this week (needs reporting prep)
5. Healthy accounts on regular rotation schedule

---

## TUESDAY–THURSDAY: Execute & Optimize (4–6 hrs total)

### Batch Optimizations (rotating through portfolio)
- RSA review: pause low performers (consistently low CTR/Conv), write new variants
- Extension audit: fill any gaps — 4+ sitelinks, 4+ callouts, 1+ structured snippet, call ext
- Geo-targeting review: impression share by region vs. service area
- Ad scheduling: day/hour performance vs. current schedule settings
- Match type discipline: review exact/phrase/broad distribution, tighten where needed

**Rotation rule**: Touch every account at least once every 2 weeks, even if healthy.

### Client Call Prep (~5 calls/week)
Use the `ppc-deliverables` skill to generate Reporting Draft Queue entries:
1. Pull MTD metrics vs. prior month and prior year (if available)
2. Identify the 1–2 most notable things that happened
3. Draft: What Happened → Why → What We're Doing → What's Next
4. Note any questions the client typically asks, with pre-built answers

### Client Calls (~20/month, ~15 min each)
- Lead with outcomes, not mechanics
- "We tightened targeting" > "We adjusted target CPA and match types"
- Own the "why did leads drop" question — have the answer ready before the call
- Log all questions, decisions, action items with owner + due date in Client Call Notes

### Wednesday Mid-Week Check (30 min)
- Review Conversion Tracking Health alert (Script 4)
- Quick dashboard scan for accounts worsening since Monday
- Check pacing on any accounts where you made bid adjustments Monday

---

## FRIDAY: Document & Plan (1–1.5 hrs)

| Time | Action | Output |
|------|--------|--------|
| 2:00 PM | Complete Weekly Change Log — every change this week, rationale, expected impact | Completed log |
| 2:20 PM | Update Search Terms & Negatives Summary — new patterns, negatives added, waste themes | Updated master list |
| 2:35 PM | PMax hygiene notes — any pruned assets, image briefs submitted, audience signal updates | PMax notes |
| 2:50 PM | Queue creative briefs for agency teams — ad copy needs, image requests, landing page recommendations | Briefs submitted |
| 3:00 PM | Set Monday priority list — flag escalations to account managers if needed | Ready for Monday |

---

## MONTHLY (1st Monday, 2–3 hrs)

1. **Ad & Extension Auditor** (Script 6 email) — close all gaps found across portfolio
2. **Quality Score trends** (Script 5 Looker data) — identify accounts with QS erosion
3. **Generate client reports** from Looker Studio template — clone, customize, QA each
3. **Google Recommendations audit** (Script 7) — full portfolio pass, document all accept/reject decisions in Change Log
5. **Seasonal threshold review** — update script configs for upcoming season shifts
6. **Portfolio summary** for agency leadership: total spend, total leads, avg CPL, CPL vs. prior month

---

## The 5 Non-Negotiable Deliverables

| Deliverable | Cadence | Skill to Use |
|------------|---------|--------------|
| Account Change Log | Ongoing (every change) | `ppc-deliverables` |
| Search Terms & Negatives Summary | Weekly/biweekly | `ppc-search-terms-negatives` |
| PMax Asset Hygiene Notes | Weekly | `ppc-pmax-hygiene` |
| Reporting Draft Queue | Before each client call | `ppc-deliverables` |
| Client Call Notes | After each client call | `ppc-deliverables` |

---

## Skill Map — Which Skill to Use When

| Situation | Skill |
|-----------|-------|
| Auditing and triaging Google Ads recommendations across portfolio | `ppc-recommendations-audit` |
| Setting up/running automated monitoring scripts | `ppc-ads-scripts` |
| Building or updating Looker Studio dashboard/reports | `ppc-looker-studio` |
| Running Monday triage and account prioritization | `ppc-weekly-triage` |
| Search term review, negative keyword management | `ppc-search-terms-negatives` |
| PMax audit and asset hygiene | `ppc-pmax-hygiene` |
| Generating any of the 5 required deliverables | `ppc-deliverables` |
| Full workflow and cadence reference | This skill (ppc-master-workflow) |

---

## Pool/Spa Seasonality Calendar

| Month | Volume Level | Key Actions |
|-------|-------------|-------------|
| Jan–Feb | Low | Maintain accounts, start spring ramp planning |
| March | Ramping | Increase budgets, refresh creative, launch spring keywords |
| April–May | Peak | Maximum budget pacing, daily anomaly checks, PMax asset refresh |
| June–July | High | Monitor quality — high volume can mask CPL creep |
| Aug–Sept | Declining | Begin fall wind-down, identify renovation/service keywords |
| Oct–Nov | Low | Reduce budgets, shift to maintenance mode |
| Dec | Very Low | Plan next year, audit accounts, prep spring strategy |

**Spring ramp trigger**: Begin budget increase recommendations to account managers by **Feb 1** for March 1 activation.
