---
name: ppc-ads-scripts
description: Google Ads MCC-level automation scripts for managing 45+ accounts at the agency. Use this skill whenever the user needs to set up, run, modify, or troubleshoot any of the 6 automated monitoring scripts: anomaly detector, budget pacing monitor, search term waste scanner, conversion tracking health check, Quality Score tracker, or ad/extension auditor. Also use when setting up new scripts, scheduling recurring scripts, debugging script errors, or asking how to automate any aspect of Google Ads account monitoring. Triggers for "script", "automation", "MCC script", "scheduled alerts", "anomaly detection", or any request to automate Google Ads monitoring tasks.
---

# agency Google Ads Scripts

## Script Overview

| # | Script | Schedule | Output |
|---|--------|----------|--------|
| 1 | Weekly Anomaly Detector | Monday 6 AM | Email: CPL/CPC/CTR/Conv Rate anomalies by severity |
| 2 | Budget Pacing Monitor | Daily 8 AM | Email: Over/underpacing accounts |
| 3 | Search Term Waste Scanner | Every 14 days | Email: Irrelevant queries with spend |
| 4 | Conversion Tracking Health | Weekly Wednesday | Email: Accounts with spend but no conversions |
| 5 | Quality Score Tracker | Weekly Friday | Logs to Google Sheet for trend analysis |
| 6 | Ad & Extension Auditor | 1st of month | Email: Completeness gaps across portfolio |

**Where to run scripts:** Google Ads MCC → Tools → Bulk Actions → Scripts

---

## Script 1: Weekly Anomaly Detector

Compares each account's last 7 days vs. 4-week rolling baseline for key metrics. Sends severity-ranked triage email every Monday at 6 AM.

```javascript
// ============================================================
// agency ANOMALY DETECTOR — MCC Level
// Schedule: Weekly, Monday 6 AM
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@ssp.com',
  CRITICAL_THRESHOLD: 0.40,  // 40% change = CRITICAL
  WARNING_THRESHOLD: 0.20,   // 20% change = WARNING
  INFO_THRESHOLD: 0.10,      // 10% change = INFO
  MIN_SPEND: 50,             // Ignore accounts with < $50 spend last 7 days
};

function main() {
  var accountIterator = MccApp.accounts().get();
  var critical = [], warning = [], info = [];
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var accountName = account.getName();
      var anomalies = checkAccountAnomalies(accountName);
      
      anomalies.critical.forEach(function(a) { critical.push(a); });
      anomalies.warning.forEach(function(a) { warning.push(a); });
      anomalies.info.forEach(function(a) { info.push(a); });
    } catch(e) {
      Logger.log('Error on account ' + account.getName() + ': ' + e.message);
    }
  }
  
  sendAnomalyEmail(critical, warning, info);
}

function checkAccountAnomalies(accountName) {
  var result = { critical: [], warning: [], info: [] };
  
  // Get last 7 days
  var today = new Date();
  var last7Start = new Date(today - 7 * 24 * 60 * 60 * 1000);
  var last7End = new Date(today - 1 * 24 * 60 * 60 * 1000);
  
  // Get 4-week baseline (28 days ending 7 days ago)
  var baselineStart = new Date(today - 35 * 24 * 60 * 60 * 1000);
  var baselineEnd = new Date(today - 8 * 24 * 60 * 60 * 1000);
  
  var last7Data = getMetrics(last7Start, last7End);
  var baselineData = getMetrics(baselineStart, baselineEnd);
  
  if (last7Data.spend < CONFIG.MIN_SPEND) return result;
  
  // Normalize baseline to 7-day equivalent
  var baseline = {
    cpl: baselineData.cpl,
    cpc: baselineData.cpc,
    ctr: baselineData.ctr,
    convRate: baselineData.convRate
  };
  
  var metrics = [
    { name: 'CPL', current: last7Data.cpl, baseline: baseline.cpl, higherIsBad: true },
    { name: 'CPC', current: last7Data.cpc, baseline: baseline.cpc, higherIsBad: true },
    { name: 'CTR', current: last7Data.ctr, baseline: baseline.ctr, higherIsBad: false },
    { name: 'Conv Rate', current: last7Data.convRate, baseline: baseline.convRate, higherIsBad: false }
  ];
  
  metrics.forEach(function(m) {
    if (!m.baseline || m.baseline === 0) return;
    
    var change = (m.current - m.baseline) / m.baseline;
    var isBad = m.higherIsBad ? change > 0 : change < 0;
    var absChange = Math.abs(change);
    
    if (!isBad) return; // Only flag bad changes
    
    var entry = accountName + ' | ' + m.name + ': ' + 
                (change > 0 ? '+' : '') + (change * 100).toFixed(1) + '% ' +
                '(' + formatMetric(m.current, m.name) + ' vs ' + formatMetric(m.baseline, m.name) + ' baseline)';
    
    if (absChange >= CONFIG.CRITICAL_THRESHOLD) result.critical.push(entry);
    else if (absChange >= CONFIG.WARNING_THRESHOLD) result.warning.push(entry);
    else if (absChange >= CONFIG.INFO_THRESHOLD) result.info.push(entry);
  });
  
  return result;
}

function getMetrics(startDate, endDate) {
  var dateRange = formatDate(startDate) + ',' + formatDate(endDate);
  var report = AdsApp.report(
    'SELECT Cost, Clicks, Impressions, Conversions, CostPerConversion ' +
    'FROM ACCOUNT_PERFORMANCE_REPORT ' +
    'DURING ' + dateRange
  );
  
  var row = report.rows().next();
  var cost = parseFloat(row['Cost']) || 0;
  var clicks = parseInt(row['Clicks']) || 0;
  var impressions = parseInt(row['Impressions']) || 0;
  var conversions = parseFloat(row['Conversions']) || 0;
  
  return {
    spend: cost,
    cpl: conversions > 0 ? cost / conversions : 0,
    cpc: clicks > 0 ? cost / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    convRate: clicks > 0 ? (conversions / clicks) * 100 : 0
  };
}

function formatMetric(value, metricName) {
  if (metricName === 'CPL' || metricName === 'CPC') return '$' + value.toFixed(2);
  return value.toFixed(2) + '%';
}

function formatDate(date) {
  return date.getFullYear() + 
         String(date.getMonth() + 1).padStart(2, '0') + 
         String(date.getDate()).padStart(2, '0');
}

function sendAnomalyEmail(critical, warning, info) {
  var subject = '[SSP Anomaly Alert] Week of ' + new Date().toLocaleDateString() + 
                ' — ' + critical.length + ' Critical, ' + warning.length + ' Warning';
  
  var body = '=== agency WEEKLY ANOMALY REPORT ===\n\n';
  
  if (critical.length > 0) {
    body += '🚨 CRITICAL (' + critical.length + ') — Review Today:\n';
    critical.forEach(function(a) { body += '  • ' + a + '\n'; });
    body += '\n';
  }
  
  if (warning.length > 0) {
    body += '⚠️ WARNING (' + warning.length + ') — Review This Week:\n';
    warning.forEach(function(a) { body += '  • ' + a + '\n'; });
    body += '\n';
  }
  
  if (info.length > 0) {
    body += 'ℹ️ INFO (' + info.length + ') — Monitor:\n';
    info.forEach(function(a) { body += '  • ' + a + '\n'; });
    body += '\n';
  }
  
  if (critical.length === 0 && warning.length === 0) {
    body += '✅ No significant anomalies detected this week. Portfolio looks healthy.\n\n';
  }
  
  body += '\nGenerated: ' + new Date().toString();
  
  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
}
```

---

## Script 2: Budget Pacing Monitor

```javascript
// ============================================================
// agency BUDGET PACING MONITOR — MCC Level
// Schedule: Daily 8 AM
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@ssp.com',
  OVERPACE_THRESHOLD: 1.10,  // 110% of expected = overpacing
  UNDERPACE_THRESHOLD: 0.85, // 85% of expected = underpacing
};

function main() {
  var today = new Date();
  var dayOfMonth = today.getDate();
  var daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  var monthProgress = dayOfMonth / daysInMonth;
  
  var overpacing = [], underpacing = [];
  var accountIterator = MccApp.accounts().get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var budgetInfo = checkBudgetPacing(account.getName(), monthProgress, dayOfMonth);
      if (budgetInfo.status === 'OVER') overpacing.push(budgetInfo);
      if (budgetInfo.status === 'UNDER') underpacing.push(budgetInfo);
    } catch(e) {
      Logger.log('Error: ' + account.getName() + ' - ' + e.message);
    }
  }
  
  sendPacingEmail(overpacing, underpacing, dayOfMonth, daysInMonth);
}

function checkBudgetPacing(accountName, monthProgress, dayOfMonth) {
  // Get MTD spend
  var today = new Date();
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  var dateRange = formatDate(monthStart) + ',' + formatDate(new Date(today - 86400000));
  
  var report = AdsApp.report(
    'SELECT Cost FROM ACCOUNT_PERFORMANCE_REPORT DURING ' + dateRange
  );
  var row = report.rows().next();
  var mtdSpend = parseFloat(row['Cost']) || 0;
  
  // Get monthly budget (sum of all campaign daily budgets × days in month)
  var campaigns = AdsApp.campaigns().withCondition('Status = ENABLED').get();
  var totalDailyBudget = 0;
  while (campaigns.hasNext()) {
    var campaign = campaigns.next();
    totalDailyBudget += campaign.getBudget().getAmount();
  }
  var estimatedMonthlyBudget = totalDailyBudget * 30.4;
  
  var expectedSpend = estimatedMonthlyBudget * monthProgress;
  var paceRatio = expectedSpend > 0 ? mtdSpend / expectedSpend : 1;
  
  var status = 'OK';
  if (paceRatio > CONFIG.OVERPACE_THRESHOLD) status = 'OVER';
  if (paceRatio < CONFIG.UNDERPACE_THRESHOLD) status = 'UNDER';
  
  return {
    account: accountName,
    status: status,
    mtdSpend: mtdSpend,
    expectedSpend: expectedSpend,
    monthlyBudget: estimatedMonthlyBudget,
    pacePercent: (paceRatio * 100).toFixed(1)
  };
}

function formatDate(date) {
  return date.getFullYear() + 
         String(date.getMonth() + 1).padStart(2, '0') + 
         String(date.getDate()).padStart(2, '0');
}

function sendPacingEmail(overpacing, underpacing, dayOfMonth, daysInMonth) {
  var subject = '[SSP Budget Pacing] Day ' + dayOfMonth + '/' + daysInMonth + 
                ' — ' + overpacing.length + ' Over, ' + underpacing.length + ' Under';
  
  var body = '=== agency DAILY BUDGET PACING REPORT ===\n';
  body += 'Day ' + dayOfMonth + ' of ' + daysInMonth + ' (' + 
          ((dayOfMonth/daysInMonth)*100).toFixed(0) + '% through month)\n\n';
  
  if (overpacing.length > 0) {
    body += '📈 OVERPACING — Risk of Budget Exhaustion:\n';
    overpacing.forEach(function(a) {
      body += '  • ' + a.account + ': ' + a.pacePercent + '% of expected ' +
              '($' + a.mtdSpend.toFixed(0) + ' MTD vs $' + a.expectedSpend.toFixed(0) + ' expected)\n';
    });
    body += '\n';
  }
  
  if (underpacing.length > 0) {
    body += '📉 UNDERPACING — Potential Impression Share Loss:\n';
    underpacing.forEach(function(a) {
      body += '  • ' + a.account + ': ' + a.pacePercent + '% of expected ' +
              '($' + a.mtdSpend.toFixed(0) + ' MTD vs $' + a.expectedSpend.toFixed(0) + ' expected)\n';
    });
  }
  
  if (overpacing.length === 0 && underpacing.length === 0) {
    body += '✅ All accounts pacing within normal range.\n';
  }
  
  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
}
```

---

## Script 3: Search Term Waste Scanner

```javascript
// ============================================================
// agency SEARCH TERM WASTE SCANNER — MCC Level
// Schedule: Every 14 days
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@ssp.com',
  MIN_COST: 5.00,   // Only flag terms with > $5 spend
  MIN_CLICKS: 3,    // Only flag terms with > 3 clicks
  // Pool/spa specific waste patterns
  WASTE_PATTERNS: [
    'pool table', 'billiard', 'above ground', 'inflatable', 'intex', 'bestway',
    'day spa', 'massage', 'facial', 'beauty spa', 'nail spa', 'hair spa',
    'diy', 'how to', 'build your own', 'kit', 'plans', 'blueprint',
    'jobs', 'career', 'hiring', 'employment', 'apply',
    'car pool', 'carpool', 'vanpool', 'rideshare',
    'public pool', 'community pool', 'ymca', 'gym pool', 'hotel pool',
    'above-ground', 'kiddie', 'wading', 'stock tank',
    'pool noodle', 'float', 'toy', 'accessories',
    'wikipedia', 'reddit', 'forum', 'review', 'complaint', 'scam'
  ]
};

function main() {
  var flaggedTerms = [];
  var accountIterator = MccApp.accounts().get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var terms = scanSearchTerms(account.getName());
      terms.forEach(function(t) { flaggedTerms.push(t); });
    } catch(e) {
      Logger.log('Error: ' + account.getName() + ' - ' + e.message);
    }
  }
  
  // Sort by cost descending
  flaggedTerms.sort(function(a, b) { return b.cost - a.cost; });
  
  sendWasteReport(flaggedTerms);
}

function scanSearchTerms(accountName) {
  var flagged = [];
  
  var report = AdsApp.report(
    'SELECT Query, Cost, Clicks, Impressions, Conversions, CampaignName ' +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
    'WHERE Cost > ' + (CONFIG.MIN_COST * 1000000) + ' ' +  // micros
    'AND Conversions = 0 ' +
    'DURING LAST_30_DAYS'
  );
  
  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var query = row['Query'].toLowerCase();
    
    // Check against waste patterns
    var matchedPattern = '';
    CONFIG.WASTE_PATTERNS.forEach(function(pattern) {
      if (query.indexOf(pattern) !== -1) matchedPattern = pattern;
    });
    
    if (matchedPattern || parseInt(row['Clicks']) >= CONFIG.MIN_CLICKS) {
      flagged.push({
        account: accountName,
        query: row['Query'],
        cost: parseFloat(row['Cost']) || 0,
        clicks: parseInt(row['Clicks']) || 0,
        impressions: parseInt(row['Impressions']) || 0,
        conversions: parseFloat(row['Conversions']) || 0,
        campaign: row['CampaignName'],
        pattern: matchedPattern
      });
    }
  }
  
  return flagged;
}

function sendWasteReport(terms) {
  var totalWaste = terms.reduce(function(sum, t) { return sum + t.cost; }, 0);
  var subject = '[SSP Search Term Waste] ' + terms.length + ' flagged terms | $' + 
                totalWaste.toFixed(0) + ' potential waste';
  
  var body = '=== agency SEARCH TERM WASTE SCANNER ===\n';
  body += 'Period: Last 30 days\n';
  body += 'Flagged terms: ' + terms.length + '\n';
  body += 'Total potential waste: $' + totalWaste.toFixed(2) + '\n\n';
  
  if (terms.length > 0) {
    body += 'TOP FLAGGED TERMS (sorted by cost):\n';
    body += '─────────────────────────────────\n';
    
    var limit = Math.min(terms.length, 30);
    for (var i = 0; i < limit; i++) {
      var t = terms[i];
      body += 'Account: ' + t.account + '\n';
      body += 'Query: "' + t.query + '"' + (t.pattern ? ' [matches: ' + t.pattern + ']' : '') + '\n';
      body += 'Cost: $' + t.cost.toFixed(2) + ' | Clicks: ' + t.clicks + ' | Conv: ' + t.conversions + '\n';
      body += 'Campaign: ' + t.campaign + '\n\n';
    }
  }
  
  body += '\nAction: Review each term above and add confirmed waste to account/MCC negative lists.\n';
  body += 'Use ppc-search-terms-negatives skill to categorize and document additions.';
  
  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
}
```

---

## Script 4: Conversion Tracking Health Check

```javascript
// ============================================================
// agency CONVERSION TRACKING HEALTH — MCC Level
// Schedule: Weekly Wednesday
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@ssp.com',
  MIN_SPEND_FOR_ALERT: 20,  // Only alert if account spent > $20 in last 7 days
  DAYS_TO_CHECK: 7
};

function main() {
  var broken = [], suspicious = [];
  var accountIterator = MccApp.accounts().get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var health = checkConversionHealth(account.getName());
      if (health.status === 'BROKEN') broken.push(health);
      if (health.status === 'SUSPICIOUS') suspicious.push(health);
    } catch(e) {
      Logger.log('Error: ' + account.getName());
    }
  }
  
  sendHealthEmail(broken, suspicious);
}

function checkConversionHealth(accountName) {
  var endDate = new Date();
  var startDate = new Date(endDate - CONFIG.DAYS_TO_CHECK * 24 * 60 * 60 * 1000);
  var dateRange = formatDate(startDate) + ',' + formatDate(endDate);
  
  var report = AdsApp.report(
    'SELECT Cost, Conversions, AllConversions ' +
    'FROM ACCOUNT_PERFORMANCE_REPORT DURING ' + dateRange
  );
  
  var row = report.rows().next();
  var spend = parseFloat(row['Cost']) || 0;
  var conversions = parseFloat(row['Conversions']) || 0;
  var allConversions = parseFloat(row['AllConversions']) || 0;
  
  if (spend < CONFIG.MIN_SPEND_FOR_ALERT) return { status: 'OK', account: accountName };
  
  // Broken: significant spend, zero conversions
  if (spend > CONFIG.MIN_SPEND_FOR_ALERT && conversions === 0) {
    return {
      status: 'BROKEN',
      account: accountName,
      spend: spend,
      conversions: conversions,
      allConversions: allConversions,
      note: allConversions > 0 ? 
        'All Conversions = ' + allConversions + ' — may be tracking but wrong action type' : 
        'Zero conversions and zero all-conversions — tag likely not firing'
    };
  }
  
  // Suspicious: all conversions much higher than conversions (possible inflation)
  if (allConversions > conversions * 3 && conversions > 0) {
    return {
      status: 'SUSPICIOUS',
      account: accountName,
      spend: spend,
      conversions: conversions,
      allConversions: allConversions,
      note: 'All Conversions (' + allConversions + ') >> Conversions (' + conversions + ') — check if micro-conversions being counted'
    };
  }
  
  return { status: 'OK', account: accountName };
}

function formatDate(date) {
  return date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + String(date.getDate()).padStart(2,'0');
}

function sendHealthEmail(broken, suspicious) {
  if (broken.length === 0 && suspicious.length === 0) {
    MailApp.sendEmail(CONFIG.EMAIL_TO, '[SSP Conv Health] ✅ All accounts tracking normally', 
      'Conversion tracking check complete. No issues found this week.');
    return;
  }
  
  var subject = '[SSP Conv Health] 🚨 ' + broken.length + ' broken, ' + suspicious.length + ' suspicious';
  var body = '=== CONVERSION TRACKING HEALTH CHECK ===\n\n';
  
  if (broken.length > 0) {
    body += '🚨 BROKEN — Spend with ZERO conversions:\n';
    broken.forEach(function(a) {
      body += '  • ' + a.account + ': $' + a.spend.toFixed(2) + ' spent, 0 conversions\n';
      body += '    Note: ' + a.note + '\n\n';
    });
  }
  
  if (suspicious.length > 0) {
    body += '⚠️ SUSPICIOUS — Possible conversion inflation:\n';
    suspicious.forEach(function(a) {
      body += '  • ' + a.account + ': ' + a.note + '\n\n';
    });
  }
  
  body += '\nAction: Verify tags via Google Tag Assistant. Check form submission confirmation URLs. Review call tracking numbers.';
  
  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
}
```

---

## Scripts 5 & 6: Quality Score Tracker + Ad Auditor

See `references/scripts-5-6.md` for full code for:
- **Script 5**: Quality Score Tracker — logs keyword-level QS to Google Sheet weekly
- **Script 6**: Ad & Extension Auditor — monthly completeness check across all accounts

---

## Script Setup Instructions

### Installing a Script at MCC Level
1. Sign into your MCC account at ads.google.com
2. Tools & Settings → Bulk Actions → Scripts
3. Click the **+** button to create new script
4. Paste the script code
5. Name it clearly (e.g., "SSP Anomaly Detector v1")
6. Click **Authorize** — grant access when prompted
7. Click **Preview** first to test — check the logs for errors
8. Set schedule: click the clock icon next to the script

### Scheduling Reference
| Script | Frequency | Day | Time |
|--------|-----------|-----|------|
| Anomaly Detector | Weekly | Monday | 6:00 AM CST |
| Budget Pacing | Daily | Every day | 8:00 AM CST |
| Search Term Scanner | Every 2 weeks | Monday | 7:00 AM CST |
| Conv Tracking Health | Weekly | Wednesday | 7:00 AM CST |
| QS Tracker | Weekly | Friday | 5:00 PM CST |
| Ad/Extension Auditor | Monthly | 1st of month | 7:00 AM CST |

### Common Script Errors
- **"Authorization required"**: Re-authorize the script under your named credentials
- **"Cannot read property of undefined"**: Usually a date formatting issue — check date range logic
- **Script times out**: Add account filtering to exclude low-spend accounts or batch by label
- **Email not sending**: Verify `MailApp.sendEmail` is in the authorized scope
