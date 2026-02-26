---
name: ppc-deliverables
description: Generate all 5 required weekly/monthly deliverables for the agency Google Ads Specialist role: Account Change Log, Search Terms & Negatives Summary, PMax Asset Hygiene Notes, Reporting Draft Queue, and Client Call Notes. Use this skill whenever the user needs to write any of these documents, prepare for a client call, draft a performance narrative, log account changes, or document optimization decisions. Also triggers for "write the change log", "prepare client report", "draft talk track", "reporting queue", "call notes", "document changes", or any request to produce the agency's required documentation.
---

# agency Required Deliverables

## Deliverable 1: Account Change Log

**Purpose:** Document every optimization action — what changed, why, expected impact, what to watch.
**Cadence:** Ongoing. Log every change the same day it's made. Never backfill.
**Who sees it:** Internal agency team, available if client questions arise.

### Template
```
═══════════════════════════════════════════════════
ACCOUNT CHANGE LOG
Account: [Client Name]
Date: [MM/DD/YYYY]
Logged by: Matthew Carlson
═══════════════════════════════════════════════════

CHANGE #1
Type: [Bid Adjustment / Negative Keyword / RSA Update / Extension / Budget / PMax / Other]
Campaign/Ad Group: [Specific name]
Change Made: [Exact description — be specific]
  Before: [Previous state]
  After: [New state]
Rationale: [Why you made this change — data point that drove it]
Expected Impact: [What you expect to happen and when]
Watch For: [What metric/signal will confirm it worked or didn't]
Status: [Implemented / Pending / Testing]

---

CHANGE #2
[Repeat format]

═══════════════════════════════════════════════════
WEEKLY SUMMARY
Total changes this week: [#]
Accounts touched: [list]
Priority flags for account managers: [any client-facing items]
═══════════════════════════════════════════════════
```

### Good vs. Bad Log Entries

**Bad:**
```
Changed bids. Added negatives. Updated ad copy.
```

**Good:**
```
Type: Negative Keyword
Campaign: All Campaigns
Change Made: Added "pool table," "pool jobs," "above ground pool" to MCC-level 
             shared negative list and account-level list
  Before: These queries generating 340 impressions, 28 clicks, $117 spend, 0 conv
  After: These queries blocked
Rationale: Search terms report showed consistent irrelevant traffic over 3 weeks.
           No conversions from any of these terms in 90 days.
Expected Impact: ~$117/month waste eliminated, CPL should improve ~8% based on 
                 % of wasted spend relative to total.
Watch For: CPL trend over next 30 days; search terms report for new similar patterns.
```

---

## Deliverable 2: Search Terms & Negatives Summary

→ See `ppc-search-terms-negatives` skill for the full process.

### Quick Template for the Deliverable:
```
SEARCH TERMS & NEGATIVES SUMMARY
Period: [Date range]
Prepared by: Matthew Carlson

PORTFOLIO OVERVIEW
Accounts reviewed: [#]
Total search terms evaluated: [#]
Irrelevant terms blocked: [#]
Estimated monthly waste eliminated: $[Amount]

WASTE THEMES THIS PERIOD
1. [Theme name] (e.g., "DIY/Research Intent")
   Examples: "how to build a pool," "DIY pool liner," "pool plans"
   Negatives added: "how to build," "diy pool," "pool plans," "pool blueprint"
   Accounts affected: [list]
   Est. waste blocked: $[Amount]

2. [Theme name]
   [repeat]

MASTER LIST UPDATES
Added to [List Name]: [keywords added]
Total master list size: [#] keywords

EDGE CASES / DECISIONS
- "[query]": Kept — [reason it might convert; will monitor]
- "[query]": Blocked — [reason it's clearly irrelevant]

FLAGS FOR ACCOUNT MANAGERS
- [Client X]: [Specific finding worth mentioning on next call]
```

---

## Deliverable 3: PMax Asset Hygiene Notes

→ See `ppc-pmax-hygiene` skill for the full process.

### Quick Template:
```
PMAX ASSET HYGIENE NOTES
Week of: [Date]
Prepared by: Matthew Carlson

ACCOUNTS AUDITED: [list]

PRUNED ASSETS
Account | Asset Group | Asset Type | Asset | Rating | Action
[Name] | [Group] | Image/Headline/Desc | [Description] | Low | Removed

IMAGE BRIEFS SUBMITTED
Account | Asset Group | What's Needed | Due Date
[Name] | [Group] | [Description] | [Date]

AUDIENCE SIGNAL UPDATES  
[Account]: [What changed and why]

CANNIBALIZATION WATCH
[Account]: [Any PMax vs. Search overlap concerns]

URL EXCLUSION UPDATES
[Account]: [Any new pages excluded]

NEXT MONTH FOCUS
[Accounts or asset groups needing deeper review]
```

---

## Deliverable 4: Reporting Draft Queue

**Purpose:** Pre-built performance narratives for upcoming client calls. Account managers should be reading YOUR words on calls, not improvising.
**Cadence:** Completed before every client call. Usually a rolling queue updated weekly.

### The 4-Part Client Narrative (memorize this structure)

**1. WHAT HAPPENED** — The numbers, stated plainly
> "This month, your campaigns generated 18 leads at an average cost of $74 per lead. That's down from 22 leads last month, but your cost per lead actually improved from $89."

**2. WHY** — The cause, in plain English (no jargon)
> "Lead volume dipped because search activity in your market slows down in February — we see this every year heading into late winter. The good news is your ads are working more efficiently: the budget we spent on irrelevant searches last quarter has been redirected toward the people actually looking to build a pool."

**3. WHAT WE'RE DOING** — Specific action, stated confidently
> "We've refreshed the ad headlines to lead with your spring promotion, and we're increasing the budget starting March 1st to capture the spring surge. We've also flagged some landing page recommendations to your web team to improve how mobile visitors see the form."

**4. WHAT'S NEXT** — Forward-looking, sets expectations
> "March through May is your highest-volume period. You should see lead volume increase 2–3x from where we are now. We'll be watching closely and making real-time adjustments as the season ramps."

### Reporting Draft Queue Template
```
REPORTING DRAFT QUEUE
Prepared: [Date]
For calls week of: [Date range]

─────────────────────────────────────────────────────
CLIENT: [Name]
CALL DATE/TIME: [MM/DD at HH:MM]
ACCOUNT MANAGER: [Name]

KEY METRICS (MTD vs. Prior Month):
  Leads: [#] vs. [#] ([+/-]%)
  CPL: $[#] vs. $[#] ([+/-]%)
  Spend: $[#] vs. $[#] ([+/-]%)
  Conv Rate: [#]% vs. [#]%

NARRATIVE:
  What Happened: [2–3 sentences, plain English, lead with the number they care about]
  Why: [2–3 sentences, cause — seasonal, competitive, quality improvements, etc.]
  What We're Doing: [1–2 specific actions currently in motion]
  What's Next: [Forward-looking 30-day expectation]

LIKELY CLIENT QUESTIONS:
  Q: [Anticipated question]
  A: [Pre-built answer]

ACTION ITEMS FROM LAST CALL:
  - [Item]: [Status: Complete/In Progress/Blocked]

NEW ACTION ITEMS THIS CALL:
  - [Item]: [Owner] by [Date]
─────────────────────────────────────────────────────
[Repeat for each call]
```

---

## Deliverable 5: Client Call Notes

**Purpose:** Record what was discussed, decided, and assigned. Protects both agency and client if questions arise later.
**Cadence:** Completed within 2 hours of each call.

### Template
```
CLIENT CALL NOTES
Client: [Name]
Date: [MM/DD/YYYY]
Attendees: [Matthew Carlson + Account Manager + Client name/title]
Duration: [~15 min]

PERFORMANCE SUMMARY REVIEWED:
[2 sentences on what metrics were covered]

CLIENT REACTIONS:
[ ] Satisfied — no concerns raised
[ ] Questions about performance — see below
[ ] Concerned — escalation may be needed
[ ] Excited — potential upsell or expansion discussed

QUESTIONS RAISED BY CLIENT:
Q: [Question]
A: [How it was answered]
Follow-up needed: [Yes/No — if yes, who handles it]

DECISIONS MADE:
- [Decision]: [Owner]

ACTION ITEMS:
Item | Owner | Due Date | Status
[Item] | [Matthew/AM/Client] | [Date] | Open

NOTES FOR NEXT CALL:
[Anything to remember to address next month]

INTERNAL FLAGS (not shared with client):
[Anything the account manager should know that shouldn't go in client-facing notes]
```

---

## Quick Narrative Phrases by Situation

### When leads dropped:
*"Search volume in your area was lower this [period] — this is typical [seasonal context]. Your cost per lead actually [improved/held steady], which means when people did search, we were winning quality clicks. We expect volume to pick up as [season/event]."*

### When CPL increased:
*"We saw cost-per-lead increase this month, driven primarily by [increased competition in your market / seasonal CPC increases / expansion into new campaign territory]. We've been tightening targeting to offset the pressure, and we expect to see CPL stabilize as [reason]."*

### When performance is strong:
*"Strong month — [X] leads at $[CPL], which is [better than / in line with] our target. The negative keyword cleanup we did last month is showing up in these numbers. We're going to push that further and are also prepping for the spring ramp."*

### When tracking is being fixed:
*"We identified a tracking issue this week that was causing some conversions to not be counted correctly. Our team is on it — this may cause some short-term reporting noise but the actual lead volume isn't affected."*
