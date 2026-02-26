---
name: ppc-recommendations-audit
description: Audit, score, and triage Google Ads recommendations across all MCC accounts into a prioritized action report. Use this skill whenever the user needs to review Google Ads recommendations across the portfolio, wants to know which recommendations to accept or reject and why, needs a scored triage list of recommendations by account, wants to run the MCC-level Recommendations Audit script, needs to document accept/reject rationale for the deliverable, or asks "what does Google want me to do across my accounts". Also triggers for "recommendations report", "optimization score", "Google suggestions", "accept or reject", "recommendation triage", or any request to systematically evaluate Google Ads auto-recommendations. This skill includes a complete MCC-level script that pulls all recommendations, scores them by type and estimated impact, and emails a prioritized report.
---

# PPC Recommendations Audit

## Why This Exists

Google Ads recommendations are a mix of genuinely valuable suggestions and algorithm-serving traps. Left unchecked, auto-apply settings can silently drain budgets, expand targeting beyond intent, and inflate "Optimization Score" while hurting actual lead quality. This skill gives you a systematic protocol to evaluate every recommendation across every account — accept what helps, reject what doesn't, document both.

**The rule:** Never accept a recommendation because it improves Optimization Score. Accept it only if it serves the client's conversion goal.

---

## The MCC Recommendations Audit Script

Runs across all accounts. Pulls every active recommendation, scores it by priority (impact × recommendation type weight), and emails a ranked triage report every Monday at 7 AM alongside your anomaly email.

```javascript
// ============================================================
// PPC RECOMMENDATIONS AUDIT — MCC Level
// Schedule: Weekly Monday 7 AM (run after anomaly detector)
// Outputs: Priority-scored email report + accept/reject guidance
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@agency.com',
  MIN_ACCOUNT_SPEND: 100,   // Skip accounts with < $100/month spend

  // Recommendation type weights (1–5 scale)
  // Higher = more likely to be worth acting on for lead gen
  TYPE_WEIGHTS: {
    'KEYWORD':                          4,  // Usually good — expanding reach
    'REMOVE_REDUNDANT_KEYWORDS':        5,  // Almost always accept
    'FIX_CAMPAIGN_NEGATIVE_KEYWORD':    5,  // Critical — blocking your own traffic
    'ADD_NEGATIVE_KEYWORD':             4,  // Good — reduces waste
    'UPGRADE_SMART_SHOPPING_CAMPAIGN':  2,  // Evaluate carefully
    'TARGET_CPA_OPT_IN':               3,  // Depends on conversion volume
    'TARGET_ROAS_OPT_IN':              2,  // Rarely right for lead gen
    'MAXIMIZE_CLICKS_OPT_IN':          1,  // Usually wrong — optimizes for clicks not leads
    'MAXIMIZE_CONVERSIONS_OPT_IN':     3,  // OK if conversion tracking is clean
    'CALLOUT_EXTENSION':               4,  // Easy win, usually accept
    'SITELINK_EXTENSION':              4,  // Easy win, usually accept
    'CALL_EXTENSION':                  5,  // Always accept for lead gen
    'RESPONSIVE_SEARCH_AD':            4,  // Accept — more RSA variants = better
    'USE_BROAD_MATCH_KEYWORD':         2,  // Caution — can blow budgets
    'UPGRADE_LOCAL_CAMPAIGN':          2,  // Evaluate based on account goals
    'SET_TARGET_CPA':                  3,  // Depends on data quality
    'RAISE_TARGET_CPA_BID_TOO_LOW':    2,  // Often unnecessary; check data first
    'FORECASTING_SET_TARGET_ROAS':     1,  // Rarely appropriate for lead gen
    'SHOPPING_ADD_AGE_GROUP':          1,  // Not relevant for service lead gen
    'PERFORMANCE_MAX_OPT_IN':          2,  // Evaluate per account — see ppc-pmax-hygiene
    'DEFAULT':                          2   // Unknown type — manual review required
  },

  // Impact threshold: only include recs above this estimated monthly value
  MIN_IMPACT_USD: 0
};

function main() {
  var report = {
    critical: [],   // Score >= 20: act this week
    high:     [],   // Score 12–19: act this month
    medium:   [],   // Score 6–11: review and decide
    low:      [],   // Score < 6: probably decline
    autoApplyWarnings: []
  };

  var accountIterator = MccApp.accounts().get();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);

    try {
      var spend = getMonthlySpend(account.getName());
      if (spend < CONFIG.MIN_ACCOUNT_SPEND) continue;

      var recs = getRecommendations(account.getName(), spend);
      recs.forEach(function(rec) {
        var tier = scoreTier(rec.score);
        report[tier].push(rec);
      });

      // Check for dangerous auto-apply settings
      checkAutoApply(account, report.autoApplyWarnings);

    } catch(e) {
      Logger.log('Error: ' + account.getName() + ' — ' + e.message);
    }
  }

  // Sort each tier by score descending
  ['critical','high','medium','low'].forEach(function(tier) {
    report[tier].sort(function(a,b){ return b.score - a.score; });
  });

  sendReportEmail(report);
}

function getMonthlySpend(accountName) {
  try {
    var report = AdsApp.report(
      'SELECT Cost FROM ACCOUNT_PERFORMANCE_REPORT DURING LAST_30_DAYS'
    );
    var row = report.rows().next();
    return parseFloat(row['Cost']) || 0;
  } catch(e) { return 0; }
}

function getRecommendations(accountName, monthlySpend) {
  var results = [];

  try {
    var recIterator = AdsApp.recommendations()
      .withCondition('recommendation_state = "APPLICABLE"')
      .get();

    while (recIterator.hasNext()) {
      var rec = recIterator.next();
      var type = rec.getType() || 'DEFAULT';
      var impact = estimateImpact(rec);
      var typeWeight = CONFIG.TYPE_WEIGHTS[type] || CONFIG.TYPE_WEIGHTS['DEFAULT'];

      // Score = type weight (1-5) × impact multiplier (1-5) × 1
      var impactMultiplier = Math.min(5, Math.max(1, Math.ceil(impact / 50)));
      var score = typeWeight * impactMultiplier;

      var guidance = getGuidance(type);

      results.push({
        account:     accountName,
        type:        formatTypeName(type),
        rawType:     type,
        impact:      impact,
        score:       score,
        typeWeight:  typeWeight,
        guidance:    guidance.action,
        rationale:   guidance.rationale,
        monthSpend:  monthlySpend
      });
    }
  } catch(e) {
    Logger.log('Rec error for ' + accountName + ': ' + e.message);
  }

  return results;
}

function estimateImpact(rec) {
  // Try to get estimated monthly cost impact from recommendation metadata
  try {
    var impact = rec.getImpact();
    if (impact && impact.potentialMetricsQualifier) {
      // Return absolute value — negative = cost savings, positive = value add
      return Math.abs(impact.costMicros / 1000000) || 10;
    }
  } catch(e) {}
  return 10; // Default $10 impact if not available
}

function formatTypeName(type) {
  return type.replace(/_/g, ' ')
             .toLowerCase()
             .replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}

function scoreTier(score) {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6)  return 'medium';
  return 'low';
}

function checkAutoApply(account, warnings) {
  // Alert if account has auto-apply enabled on high-risk recommendation types
  // Note: Full auto-apply API access varies — this checks via account settings where available
  try {
    var settingsReport = AdsApp.report(
      'SELECT customer.id, customer.auto_tagging_enabled FROM customer LIMIT 1'
    );
    // If the account has auto-apply on, we flag it
    // Specific auto-apply detection requires Ads API; log a manual check flag
    warnings.push({
      account: account.getName(),
      note: 'Manual check: verify auto-apply settings are OFF in Recommendations → Auto-apply settings'
    });
  } catch(e) {}
}

function getGuidance(type) {
  var guidanceMap = {
    'REMOVE_REDUNDANT_KEYWORDS': {
      action: '✅ ACCEPT',
      rationale: 'Redundant keywords waste budget on duplicate auctions. Safe to clean up.'
    },
    'FIX_CAMPAIGN_NEGATIVE_KEYWORD': {
      action: '🚨 ACCEPT IMMEDIATELY',
      rationale: 'Your own negative keywords are blocking valid traffic. This is blocking conversions right now.'
    },
    'ADD_NEGATIVE_KEYWORD': {
      action: '✅ REVIEW & ACCEPT',
      rationale: 'Review the specific terms first. If they match your pool/spa waste patterns, accept. If borderline, monitor.'
    },
    'CALL_EXTENSION': {
      action: '✅ ACCEPT',
      rationale: 'Call extensions are always right for local service lead gen. Accept and configure immediately.'
    },
    'CALLOUT_EXTENSION': {
      action: '✅ ACCEPT',
      rationale: 'Free ad real estate. Write callouts specific to the client (Licensed, Free Estimate, etc.).'
    },
    'SITELINK_EXTENSION': {
      action: '✅ ACCEPT',
      rationale: 'More ad space, better CTR. Write client-specific sitelinks, not generic ones.'
    },
    'RESPONSIVE_SEARCH_AD': {
      action: '✅ ACCEPT',
      rationale: 'More RSA variants = better testing data. Write the ad yourself rather than using Google\'s suggestion.'
    },
    'TARGET_CPA_OPT_IN': {
      action: '⚠️ EVALUATE',
      rationale: 'Only accept if account has 30+ conversions/month with clean tracking. Below that, algorithm lacks data.'
    },
    'MAXIMIZE_CONVERSIONS_OPT_IN': {
      action: '⚠️ EVALUATE',
      rationale: 'Check conversion volume and tracking quality first. Good with 20+ clean conversions/month.'
    },
    'USE_BROAD_MATCH_KEYWORD': {
      action: '❌ DECLINE',
      rationale: 'Broad match without Target CPA and strong negatives will inflate CPL. Too risky for lead gen accounts.'
    },
    'MAXIMIZE_CLICKS_OPT_IN': {
      action: '❌ DECLINE',
      rationale: 'Optimizes for clicks, not leads. Wrong objective for every lead gen account in this portfolio.'
    },
    'TARGET_ROAS_OPT_IN': {
      action: '❌ DECLINE',
      rationale: 'ROAS bidding requires revenue data, which lead gen accounts don\'t have in Google Ads. Wrong strategy.'
    },
    'FORECASTING_SET_TARGET_ROAS': {
      action: '❌ DECLINE',
      rationale: 'Same as above — ROAS optimization does not apply to lead generation.'
    },
    'RAISE_TARGET_CPA_BID_TOO_LOW': {
      action: '⚠️ EVALUATE',
      rationale: 'Check actual CPL trend first. If CPL is stable and lead quality is good, this may just be Google pushing spend.'
    },
    'PERFORMANCE_MAX_OPT_IN': {
      action: '⚠️ EVALUATE',
      rationale: 'See ppc-pmax-hygiene skill before acting. Only accept with strong guardrails in place.'
    },
    'DEFAULT': {
      action: '⚠️ MANUAL REVIEW',
      rationale: 'Unknown recommendation type. Review in-account before acting.'
    }
  };

  return guidanceMap[type] || guidanceMap['DEFAULT'];
}

function sendReportEmail(report) {
  var totalRecs = report.critical.length + report.high.length +
                  report.medium.length + report.low.length;

  var subject = '[PPC Recommendations] ' + report.critical.length +
                ' Critical | ' + report.high.length + ' High | ' +
                report.medium.length + ' Medium | ' + report.low.length + ' Low';

  var body = '=== GOOGLE ADS RECOMMENDATIONS AUDIT ===\n';
  body += 'Run: ' + new Date().toLocaleDateString() + '\n';
  body += 'Total recommendations found: ' + totalRecs + '\n\n';

  if (report.autoApplyWarnings.length > 0) {
    body += '🔴 AUTO-APPLY CHECK REQUIRED:\n';
    body += 'Manually verify auto-apply is DISABLED in each account:\n';
    body += 'Recommendations → Auto-apply → confirm all toggles are OFF\n\n';
  }

  function formatSection(label, emoji, recs) {
    if (recs.length === 0) return '';
    var s = emoji + ' ' + label.toUpperCase() + ' (' + recs.length + '):\n';
    s += '─'.repeat(50) + '\n';
    recs.forEach(function(r) {
      s += 'Account:     ' + r.account + '\n';
      s += 'Type:        ' + r.type + '\n';
      s += 'Est. Impact: $' + r.impact.toFixed(0) + '/mo\n';
      s += 'Score:       ' + r.score + '/25\n';
      s += 'Action:      ' + r.guidance + '\n';
      s += 'Why:         ' + r.rationale + '\n\n';
    });
    return s;
  }

  body += formatSection('CRITICAL — Act This Week', '🚨', report.critical);
  body += formatSection('HIGH — Act This Month',    '🔴', report.high);
  body += formatSection('MEDIUM — Review & Decide', '🟡', report.medium);
  body += formatSection('LOW — Likely Decline',     '⚪', report.low);

  body += '\n═'.repeat(50) + '\n';
  body += 'SCORING METHODOLOGY:\n';
  body += 'Score = Type Weight (1–5) × Impact Multiplier (1–5)\n';
  body += 'Critical ≥ 20 | High 12–19 | Medium 6–11 | Low < 6\n';
  body += 'Document all accept/reject decisions in Account Change Log.\n';
  body += 'NEVER accept a recommendation solely to raise Optimization Score.\n';

  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
  Logger.log('Report sent. ' + totalRecs + ' recommendations across ' +
             (report.critical.length + report.high.length + report.medium.length + report.low.length) + ' tiers.');
}
```

---

## Scoring Methodology Explained

Every recommendation gets a score from 1–25:

**Score = Type Weight × Impact Multiplier**

| Factor | Range | Logic |
|--------|-------|-------|
| Type Weight | 1–5 | How beneficial this recommendation TYPE typically is for lead gen (pre-set in CONFIG) |
| Impact Multiplier | 1–5 | Estimated monthly dollar impact ÷ 50, capped at 5 |
| Final Score | 1–25 | Higher = act sooner |

**Tiers:**
- **Critical (≥20):** Structural issues — blocking own traffic, missing call extensions, redundant keywords. Act this week.
- **High (12–19):** Extension gaps, RSA opportunities, negative keyword adds. Work through this month.
- **Medium (6–11):** Bidding strategy considerations, PMax suggestions. Evaluate carefully before deciding.
- **Low (<6):** Broad match pushes, ROAS suggestions, click-maximization. Default position is decline.

---

## The Accept/Reject Decision Framework

Before acting on ANY recommendation, answer three questions:

1. **Does this serve the client's conversion goal?** (Not Google's optimization score — the client's actual leads)
2. **Does account data support it?** (Enough conversions? Clean tracking? Right season?)
3. **What's the downside if it underperforms?** (Reversible in a day? Or baked in for weeks?)

If you can't answer all three confidently → decline and document why.

---

## Documenting Decisions (Required)

Every accept/reject decision goes in the Account Change Log using this format:

```
Type: Google Recommendation — [Recommendation Name]
Account: [Name]
Campaign: [If campaign-specific]
Decision: ACCEPTED / DECLINED
Score: [X/25]
Rationale: [Why — data point or strategic reason, not "Google suggested it"]
Expected Impact: [What you expect if accepted, or what risk you avoided if declined]
```

**Declined recommendations must be logged too.** If something goes wrong later, you need to show you made a deliberate decision, not that you missed it.

---

## What To Do With the Email Each Monday

1. **Critical items first** — open each flagged account, verify the recommendation is still active, apply if the guidance says accept
2. **High items** — schedule for Tue–Thu optimization batch, don't let them carry over two weeks
3. **Medium items** — review in-account, check conversion volume and tracking quality before deciding
4. **Low items** — scan briefly, default to decline unless something looks unusual for that specific account
5. **Log every decision** the same day you make it

---

## Manual Check: Auto-Apply Settings

The script flags accounts for manual verification. Do this quarterly and whenever a new account is onboarded:

**Navigation:** Google Ads → Recommendations (left nav) → Auto-apply (top right tab)

**What to look for:** Any toggle in the ON position. Risky auto-applies that are sometimes enabled by default:
- Use broad match (❌ always OFF)
- Optimize ad rotation (⚠️ evaluate per account)
- Add keywords (❌ always OFF — you control the keyword list)
- Upgrade to maximize conversions (❌ OFF unless you explicitly chose this strategy)

**Safe to leave ON (if it exists):**
- Fix campaign negative keywords (this catches your own blocking errors)

Document your auto-apply audit in the monthly checklist.

---

## Script Setup

**Schedule:** Monday 7:00 AM CST (runs after Anomaly Detector, before you start triage)
**Location:** MCC level → Tools → Bulk Actions → Scripts
**Config to update:**
- `EMAIL_TO` — your agency email
- `MIN_ACCOUNT_SPEND` — increase if you have very large accounts that should always be included regardless

See `ppc-ads-scripts` skill for full installation walkthrough.
