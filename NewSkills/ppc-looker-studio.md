---
name: ppc-looker-studio
description: Looker Studio dashboard setup, configuration, and reporting for the agency's pool/spa Google Ads accounts. Use this skill whenever the user needs to build or update a Looker Studio portfolio overview dashboard, create or clone client-facing reports, connect Google Ads data sources, set up conditional formatting, configure date comparison scorecards, troubleshoot data discrepancies between Looker Studio and Google Ads UI, or design the 6-page client report template. Triggers for "Looker Studio", "dashboard setup", "client report", "data studio", "reporting template", "scorecards", "portfolio dashboard", or any question about the agency's reporting infrastructure.
---

# agency Looker Studio Setup

## Two Dashboards to Build

| Dashboard | Audience | Purpose | Update Cadence |
|-----------|----------|---------|----------------|
| Portfolio Overview | Internal (you + agency team) | Weekly triage scanning tool | Auto-refreshes daily |
| Client Report Template | Clients (via account managers) | Monthly performance review | Cloned + customized per client |

---

## Dashboard 1: Portfolio Overview (Internal)

### Purpose
Single view of all 45+ accounts with conditional formatting (Red/Yellow/Green) so Monday triage takes visual scanning, not manual calculation.

### Data Source Setup
1. Create new Looker Studio report
2. Add data source: Google Ads → Connect → Select MCC
3. Choose **"All Accounts"** — this pulls aggregate data across the portfolio
4. For account-level breakdown, use the **Account** dimension

### Required Metrics and Dimensions

**Dimensions:**
- Account Name
- Date (for trend charts)
- Campaign Name (for drill-down)

**Metrics:**
- Cost (MTD)
- Conversions (MTD)
- Cost/Conversion (CPL)
- Conversion Rate
- Clicks
- CTR
- Impressions
- Budget (from campaign settings)

### Page 1: Portfolio Summary Table

**Component: Scorecard Row (Top)**
Create 5 scorecards across the top:
| Scorecard | Metric | Comparison |
|-----------|--------|------------|
| Total MTD Spend | Sum of Cost | vs. Prior Month |
| Total MTD Leads | Sum of Conversions | vs. Prior Month |
| Portfolio Avg CPL | Calculated: Cost/Conversions | vs. Prior Month |
| Avg Conversion Rate | Avg Conv Rate | vs. Prior Month |
| Accounts at Risk | Count of accounts with CPL > 125% of 4-week avg | — |

**Component: Account-Level Data Table**

Columns (in order):
1. Account Name
2. MTD Spend ($)
3. MTD Budget ($)
4. Budget Pace % (calculated field: MTD Spend / (Monthly Budget × Day of Month / Days in Month))
5. MTD Conversions (#)
6. MTD CPL ($)
7. Conv Rate (%)
8. CTR (%)
9. WoW Change CPL (%) — requires date comparison

**Conditional Formatting Rules (apply to CPL column):**

In table properties → Style → Data bar or conditional formatting:
- CPL > 125% of 30-day avg → Red background
- CPL 100–125% of 30-day avg → Yellow background  
- CPL < 100% of 30-day avg → Green background

To calculate this, create a **calculated field:**
```
CPL Status = CASE
  WHEN Cost/Conversions > (30_day_avg_cpl * 1.25) THEN "RED"
  WHEN Cost/Conversions > (30_day_avg_cpl * 1.00) THEN "YELLOW"
  ELSE "GREEN"
END
```

**Note:** Looker Studio's conditional formatting by "compared to another value" requires a blended data source. For simplicity in v1, use manual threshold values that you update monthly.

**Sort:** Default sort by CPL descending (worst performers first).

**Filter controls to add:**
- Date range selector (default: This Month to Date)
- Account name search/filter
- CPL Status filter (show only RED accounts)

---

## Dashboard 2: Client Report Template (6-Page Structure)

### Setup: Create Master Template, Clone Per Client

1. Build the template with **one account's data** connected
2. When deploying for a specific client, **make a copy** (File → Make a copy)
3. In the copy, update the data source filter to the specific client's account

### Page 1: Executive Summary

**Layout: 4 scorecards + 1 line chart**

Scorecards (this month vs. prior month):
- Total Leads
- Cost Per Lead  
- Total Ad Spend
- Conversion Rate

Line chart: Conversions over last 90 days (shows trend visually)

**Calculated Fields needed:**
```
CPL = SUM(Cost) / SUM(Conversions)
MoM CPL Change = (Current CPL - Prior Period CPL) / Prior Period CPL
```

**Date comparison setup:**
- Click scorecard → Data → Add comparison period: Previous Period
- This automatically shows the arrow (up/down) and % change

### Page 2: Trend Analysis

**Components:**
1. Dual-axis line chart: Conversions (bars) + CPL (line) over 90 days
2. 12-month conversion volume bar chart (seasonal context)
3. YoY comparison table (if data exists): This Month vs. Same Month Last Year

**Key insight for pool/spa:** This page helps clients visually understand seasonality. A February dip looks alarming in isolation — on a 12-month chart, it's obviously normal.

### Page 3: Campaign Breakdown

**Component: Campaign-level data table**

Columns:
- Campaign Name
- Status
- Campaign Type (Search / PMax / Demand Gen)
- Spend
- Conversions
- CPL
- Conv Rate
- CTR
- Impression Share (Search only)

**Sortable:** Yes — clients can click headers
**Filter:** Enabled campaigns only

### Page 4: Geographic Performance

**Component: Map visualization + table**

- Google Maps heat map (Looker Studio has a built-in geo chart)
- Set dimension to: City or Region
- Metric: Conversions (size of bubble) + CPL (color)

**Supplemental table:**
- Top 10 converting cities
- Columns: City, Conversions, CPL, % of Total Spend

**Why this matters for pool/spa clients:** They know their service area precisely. If you're getting conversions from 40 miles outside their service area, they want to know — and so do you.

### Page 5: Device & Schedule Performance

**Two components:**

Device table:
- Dimensions: Device (Mobile, Desktop, Tablet)
- Metrics: Clicks, Conversions, CPL, Conv Rate, Spend %

Hour/Day heat map:
- Dimension: Hour of Day + Day of Week
- Metric: Conversion Rate (color intensity)
- This shows when the account's best leads come in — informs bid scheduling decisions

### Page 6: Search Terms Summary

**Component: Filtered search terms table**

- Dimension: Search Term
- Metrics: Impressions, Clicks, Cost, Conversions, CPL
- Filter: Cost > $5 AND Conversions = 0 (shows waste — relevant for client trust-building)
- Second view: Top converting search terms (Conversions > 0, sorted by Conv Rate)

**Why show this to clients:** Pool/spa clients deeply appreciate seeing that you're fighting for their budget. Showing "we blocked these terms that were wasting your money" builds trust.

---

## Connecting Quality Score Data (Script 5 → Looker Studio)

Once Script 5 is running and logging to Google Sheet:

1. In Looker Studio → Add Data → Google Sheets
2. Select the QS_Data sheet
3. Create a new page in the Portfolio Overview: "Quality Score Trends"

**QS Trend Page Components:**
- Line chart: Average QS over time per account (dimension: Account, metric: avg QS, dimension: Date)
- Table: Current week QS by account, sortable, with conditional formatting (QS < 6 = red, QS 7–8 = yellow, QS 9–10 = green)
- Pie/bar chart: Distribution of QS components (Expected CTR, Ad Relevance, Landing Page Exp) across portfolio

---

## Data Source Troubleshooting

### "Numbers don't match Google Ads UI"

**Most common causes:**

1. **Attribution window difference**: Looker Studio default is last click 30-day. Google Ads UI may use a different window. Match them: in Looker Studio → Data source settings → Attribution settings.

2. **Conversion action mismatch**: Looker Studio may be pulling all conversion actions including micro-conversions. In Google Ads, "Conversions" column only shows primary actions. Filter your Looker Studio data source to primary conversion actions only.

3. **Date timezone**: Looker Studio uses UTC by default. Google Ads uses account timezone. Set Looker Studio → Report settings → Timezone to match account timezone (usually CST for agency clients).

4. **Impression date vs. conversion date**: If using "Conversion Date" in Looker Studio vs. "Click Date" in Google Ads, recent conversions may appear in different time periods.

**Fix protocol:**
1. Set both to same date range
2. Set same attribution window
3. Set same timezone
4. Compare total spend first (spend is always reliable) — if spend matches, the issue is conversion counting

### "Client report shows N/A or no data"

- Check that the cloned report's data source filter matches the correct account
- Verify the account has data in the selected date range
- Check that MCC permissions allow Looker Studio access to child accounts

---

## Report Sharing Best Practices

**Internal Portfolio Overview:**
- Share with: agency team members only
- Access: "Can view" for account managers, "Can edit" for you
- Refresh: Set to auto-refresh daily

**Client Reports:**
- Do NOT share raw Looker Studio link directly with clients
- Account managers should present the report on screen during calls (screenshare)
- Or: Export as PDF (File → Download → PDF) for email delivery
- Never give clients edit access to report templates

**Template naming convention:**
```
SSP_[ClientName]_[YYYY-MM]_GoogleAds_Report
```
Example: `SSP_BluewaterPools_2026-03_GoogleAds_Report`
