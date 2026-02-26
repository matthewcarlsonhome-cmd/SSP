---
name: ppc-search-terms-negatives
description: Search term review, negative keyword management, and waste elimination for pool/spa Google Ads accounts at the agency. Use this skill whenever the user needs to review search terms reports, identify wasted spend, build or expand negative keyword lists, write the weekly Search Terms & Negatives Summary deliverable, organize negative keywords into themed lists, or wants to know what negative keywords to add to pool/spa accounts. Also triggers for "search term waste", "negative keywords", "irrelevant queries", "junk traffic", or any question about match types and query filtering.
---

# agency Search Terms & Negatives

## The Deliverable
**Search Terms & Negatives Summary** — due biweekly (or monthly per agency cadence).

Format:
```
PERIOD: [Date range]
ACCOUNTS REVIEWED: [Count]
NEW NEGATIVES ADDED: [Count]
ESTIMATED WASTE ELIMINATED: $[Amount] (based on avg CPC × blocked impressions)

WASTE THEMES FOUND:
- [Theme]: [examples] → [negatives added]
- [Theme]: [examples] → [negatives added]

MASTER LIST UPDATES:
- Added to [list name]: [keywords]
- Flagged for review: [any edge cases]

NOTES FOR ACCOUNT MANAGERS:
- [Anything client-facing, e.g., "Client X had significant job-seeker traffic — may want to discuss in next call"]
```

---

## Pool/Spa Master Negative Keyword List

Organize negatives into themed lists at the MCC level for portfolio-wide efficiency.

### List 1: Wrong Product Type
```
pool table
billiard
foosball
air hockey
ping pong table
above ground pool
inflatable pool
above-ground
intex
bestway
coleman pool
kiddie pool
baby pool
wading pool
stock tank pool
hot tub vs pool [if only selling one]
swim spa [if client doesn't offer]
```

### List 2: DIY / Non-Professional Intent
```
diy pool
how to build a pool
build your own pool
pool kit
pool liner kit
pool pump repair myself
how to repair
how to fix
how to install
youtube pool
pool plans
pool blueprints
pool permits diy
pool chemicals how to
```

### List 3: Job Seekers
```
pool jobs
swimming pool jobs
pool technician job
pool cleaner jobs
pool service jobs
hiring pool
pool company careers
pool maintenance jobs
apply pool
pool job openings
pool employment
```

### List 4: Irrelevant Products & Services
```
car pool
carpool
vanpool
rideshare
pool noodle
pool float
pool toy
pool accessories
pool cover [if not offered]
pool fence [if not offered]
pool alarm
pool test kit
pool chemicals only
pool shock
chlorine tablets
pool brush
pool vacuum
pool skimmer
natatorium
lap pool [if luxury residential only]
```

### List 5: Out-of-Area / Wrong Geo (customize per account)
```
[cities outside service area]
[states outside service area]
near me [only if targeting is precise — usually keep this]
```

### List 6: Day Spa / Unrelated Spa
```
day spa
massage spa
facial spa
spa treatment
spa package
spa resort
spa weekend
spa day
nail spa
hair spa
beauty spa
medical spa
med spa [unless client offers]
spa music
spa near me [if client is pool-only]
```

### List 7: Public / Commercial Pools
```
public pool
community pool
ymca pool
gym pool
hotel pool
motel pool
apartment pool
condo pool
HOA pool
municipal pool
public swimming
pool membership
lap swim
swim team
swim lessons [if not offered]
swim club
aquatic center
```

### List 8: Research / Non-Buyer Intent
```
pool history
types of pools
pool wikipedia
pool pros and cons
should I get a pool
is a pool worth it
pool facts
pool statistics
pool survey
pool forum
pool reddit
pool review
worst pool companies
pool complaints
pool scam
pool lawsuit
```

---

## Weekly Search Terms Review Process

### Step 1: Pull Search Terms Reports (15 min)
In Google Ads UI → Keywords → Search Terms:
- Set date range: last 14 days
- Filter: Conversions = 0, Impressions > 50
- Sort by Cost descending
- Export to CSV

**At MCC level (faster):**
Use Script 3 (Search Term Waste Scanner) — runs automatically biweekly and emails a pre-filtered report.

### Step 2: Categorize What You Find

For each irrelevant query, assign to a waste category:

| Category | Action | Example |
|----------|--------|---------|
| Matches existing negative list | Add to relevant account-level list | "pool table" |
| New theme — add to master | Add to MCC-level shared list | "swim spa installation" |
| Borderline (may convert sometimes) | Monitor, don't block yet | "pool prices" |
| Competitor name | Evaluate — usually keep unless very high spend | "[Competitor] pool" |
| Geographic error | Add geo-specific negative or tighten targeting | "Phoenix pool builder" (if in Chicago) |

### Step 3: Add Negatives Efficiently

**Priority order for adding:**
1. Exact match `[pool table]` for confirmed irrelevant queries with spend
2. Phrase match `"pool jobs"` for job-seeker themes
3. Broad match negative `-above ground` only when you're sure it's never relevant

**Where to add:**
- Single account issue → account-level negative list
- Portfolio-wide theme → MCC-level shared negative list (propagates to all accounts)
- Campaign-specific (e.g., PMax only) → campaign-level list

### Step 4: Update the Master List
Add new confirmed negatives to the master reference document. Note:
- Date added
- Account(s) where found
- Estimated spend blocked (CPC × impressions)

---

## Match Type Strategy for Pool/Spa Lead Gen

### Recommended Mix
- **Exact match** `[swimming pool installation near me]` — highest intent, protect these
- **Phrase match** `"pool builder"` — good middle ground for local service queries
- **Broad match** — use sparingly with Target CPA only on accounts with 30+ monthly conversions

### Red Flags in Match Type Distribution
- Broad match > 60% of spend on account with < 20 conversions/month = too much autonomy given to algorithm
- Exact match < 20% of conversions = strong intent terms may not be in your keyword list
- Single keyword driving >30% of spend = dangerous concentration, needs expansion

### Search Term Expansion (Positive Side)
When reviewing search terms, also note queries that:
- Converted but aren't in your keyword list → add as exact match keywords
- Show local buying intent you hadn't targeted → add as phrase match
- Include location modifiers with high intent → add location + service combinations

---

## Estimating Waste Eliminated

For the deliverable, calculate rough waste blocked:

```
Estimated waste = (irrelevant impressions last 30 days) × (account avg CTR) × (account avg CPC)
```

Example:
- 2,400 impressions to "pool table" queries
- Account avg CTR = 8%
- Account avg CPC = $4.20
- Estimated waste = 2,400 × 0.08 × $4.20 = **$806/month blocked**

This is the number that makes account managers and clients pay attention. Always include it.
