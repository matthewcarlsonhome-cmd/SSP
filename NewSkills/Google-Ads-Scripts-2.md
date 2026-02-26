# Scripts 5 & 6: Quality Score Tracker + Ad/Extension Auditor

## Script 5: Quality Score Tracker

Logs keyword-level Quality Score data to a Google Sheet every Friday for trend analysis in Looker Studio.

```javascript
// ============================================================
// SSP QUALITY SCORE TRACKER — MCC Level
// Schedule: Weekly Friday 5 PM
// Logs to Google Sheet for Looker Studio visualization
// ============================================================

var CONFIG = {
  SPREADSHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',  // Create sheet and paste ID
  SHEET_NAME: 'QS_Data',
  MIN_IMPRESSIONS: 100  // Only track keywords with meaningful data
};

function main() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['Date', 'Account', 'Campaign', 'Ad Group', 'Keyword', 
                     'Match Type', 'QS', 'Expected CTR', 'Ad Relevance', 
                     'Landing Page Exp', 'Impressions']);
  }
  
  var today = new Date();
  var dateStr = today.toISOString().split('T')[0];
  var rows = [];
  
  var accountIterator = MccApp.accounts().get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var accountName = account.getName();
      var report = AdsApp.report(
        'SELECT CampaignName, AdGroupName, Criteria, KeywordMatchType, ' +
        'QualityScore, CreativeQualityScore, PostClickQualityScore, SearchPredictedCtr, Impressions ' +
        'FROM KEYWORDS_PERFORMANCE_REPORT ' +
        'WHERE Impressions > ' + CONFIG.MIN_IMPRESSIONS + ' ' +
        'AND Status = ENABLED ' +
        'DURING LAST_7_DAYS'
      );
      
      var reportRows = report.rows();
      while (reportRows.hasNext()) {
        var row = reportRows.next();
        var qs = parseInt(row['QualityScore']);
        if (isNaN(qs)) continue;
        
        rows.push([
          dateStr,
          accountName,
          row['CampaignName'],
          row['AdGroupName'],
          row['Criteria'],
          row['KeywordMatchType'],
          qs,
          row['SearchPredictedCtr'],
          row['CreativeQualityScore'],
          row['PostClickQualityScore'],
          row['Impressions']
        ]);
      }
    } catch(e) {
      Logger.log('Error: ' + account.getName() + ' - ' + e.message);
    }
  }
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    Logger.log('Logged ' + rows.length + ' keyword QS records');
  }
  
  // Send summary email with accounts having QS erosion
  checkQSErosion(spreadsheet, dateStr);
}

function checkQSErosion(spreadsheet, today) {
  // Simple erosion check: accounts with avg QS < 6
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  
  var accountQS = {};
  var todayData = data.filter(function(row) { return row[0] === today; });
  
  todayData.forEach(function(row) {
    var account = row[1];
    var qs = parseInt(row[6]);
    if (!isNaN(qs)) {
      if (!accountQS[account]) accountQS[account] = [];
      accountQS[account].push(qs);
    }
  });
  
  var lowQSAccounts = [];
  Object.keys(accountQS).forEach(function(account) {
    var qsScores = accountQS[account];
    var avgQS = qsScores.reduce(function(a, b) { return a + b; }, 0) / qsScores.length;
    if (avgQS < 6) {
      lowQSAccounts.push(account + ': avg QS ' + avgQS.toFixed(1) + ' (' + qsScores.length + ' keywords)');
    }
  });
  
  if (lowQSAccounts.length > 0) {
    MailApp.sendEmail(
      'your.email@ssp.com',
      '[SSP QS Alert] ' + lowQSAccounts.length + ' accounts with low Quality Score',
      'Accounts with avg QS < 6 this week:\n\n' + lowQSAccounts.join('\n') + 
      '\n\nReview in Looker Studio QS dashboard or Google Ads → Keywords for these accounts.'
    );
  }
}
```

### Google Sheet Setup for Script 5
1. Create a new Google Sheet
2. Name first sheet tab: `QS_Data`
3. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit`
4. Paste into `SPREADSHEET_ID` in the script config
5. This sheet connects to Looker Studio for QS trend visualization

---

## Script 6: Ad & Extension Auditor

Monthly completeness check across all accounts — emails a report of every account missing required ad components.

```javascript
// ============================================================
// SSP AD & EXTENSION AUDITOR — MCC Level
// Schedule: Monthly, 1st of month 7 AM
// ============================================================

var CONFIG = {
  EMAIL_TO: 'your.email@ssp.com',
  REQUIREMENTS: {
    MIN_RSAS_PER_AD_GROUP: 2,
    MIN_SITELINKS: 4,
    MIN_CALLOUTS: 4,
    MIN_STRUCTURED_SNIPPETS: 1,
    REQUIRE_CALL_EXTENSION: true,
    REQUIRE_LOCATION_EXTENSION: false  // Set true if clients have physical locations
  }
};

function main() {
  var gaps = [];
  var accountIterator = MccApp.accounts().get();
  
  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    MccApp.select(account);
    
    try {
      var accountGaps = auditAccount(account.getName());
      accountGaps.forEach(function(g) { gaps.push(g); });
    } catch(e) {
      Logger.log('Error: ' + account.getName());
    }
  }
  
  sendAuditEmail(gaps);
}

function auditAccount(accountName) {
  var gaps = [];
  
  // Check RSAs per ad group
  var adGroupReport = AdsApp.report(
    'SELECT AdGroupName, CampaignName, AdType, Status ' +
    'FROM AD_PERFORMANCE_REPORT ' +
    'WHERE AdType = RESPONSIVE_SEARCH_AD AND Status = ENABLED ' +
    'DURING LAST_30_DAYS'
  );
  
  var adGroupCounts = {};
  var rsaRows = adGroupReport.rows();
  while (rsaRows.hasNext()) {
    var row = rsaRows.next();
    var key = row['CampaignName'] + '|' + row['AdGroupName'];
    adGroupCounts[key] = (adGroupCounts[key] || 0) + 1;
  }
  
  Object.keys(adGroupCounts).forEach(function(key) {
    if (adGroupCounts[key] < CONFIG.REQUIREMENTS.MIN_RSAS_PER_AD_GROUP) {
      gaps.push(accountName + ' | ' + key.replace('|', ' > ') + 
                ': Only ' + adGroupCounts[key] + ' RSA(s) (need ' + 
                CONFIG.REQUIREMENTS.MIN_RSAS_PER_AD_GROUP + ')');
    }
  });
  
  // Check extensions
  var extReport = AdsApp.report(
    'SELECT ExtensionType, Status ' +
    'FROM EXTENSION_FEED_ITEM_REPORT ' +
    'WHERE Status = ENABLED ' +
    'DURING LAST_30_DAYS'
  );
  
  var extCounts = { SITELINK: 0, CALLOUT: 0, STRUCTURED_SNIPPET: 0, CALL: 0, LOCATION: 0 };
  var extRows = extReport.rows();
  while (extRows.hasNext()) {
    var row = extRows.next();
    var extType = row['ExtensionType'];
    if (extCounts.hasOwnProperty(extType)) extCounts[extType]++;
  }
  
  if (extCounts.SITELINK < CONFIG.REQUIREMENTS.MIN_SITELINKS)
    gaps.push(accountName + ': Only ' + extCounts.SITELINK + ' sitelinks (need ' + CONFIG.REQUIREMENTS.MIN_SITELINKS + ')');
  
  if (extCounts.CALLOUT < CONFIG.REQUIREMENTS.MIN_CALLOUTS)
    gaps.push(accountName + ': Only ' + extCounts.CALLOUT + ' callouts (need ' + CONFIG.REQUIREMENTS.MIN_CALLOUTS + ')');
  
  if (extCounts.STRUCTURED_SNIPPET < CONFIG.REQUIREMENTS.MIN_STRUCTURED_SNIPPETS)
    gaps.push(accountName + ': Missing structured snippet');
  
  if (CONFIG.REQUIREMENTS.REQUIRE_CALL_EXTENSION && extCounts.CALL === 0)
    gaps.push(accountName + ': Missing call extension');
  
  return gaps;
}

function sendAuditEmail(gaps) {
  var subject = '[SSP Ad Auditor] Monthly Report — ' + gaps.length + ' gaps found';
  
  var body = '=== SSP MONTHLY AD & EXTENSION AUDIT ===\n';
  body += 'Run date: ' + new Date().toLocaleDateString() + '\n';
  body += 'Total gaps found: ' + gaps.length + '\n\n';
  
  if (gaps.length === 0) {
    body += '✅ All accounts meet minimum ad and extension requirements!\n';
  } else {
    body += 'GAPS TO CLOSE THIS MONTH:\n';
    gaps.forEach(function(g) { body += '  • ' + g + '\n'; });
    body += '\nClose all gaps before end of month. Document in Account Change Log.';
  }
  
  MailApp.sendEmail(CONFIG.EMAIL_TO, subject, body);
}
```
