# 🔒 SECURITY AUDIT REPORT - Complete Data Dump
## Target: https://aicareerskills.netlify.app/
## Supabase Project: `khbqljdsmavpqeevosdb.supabase.co`

**Date**: 2026-01-23
**Purpose**: Full security assessment and data exposure analysis

---

## EXPOSED CREDENTIALS

| Credential | Value |
|------------|-------|
| **Supabase URL** | `https://khbqljdsmavpqeevosdb.supabase.co` |
| **Anon Key (JWT)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYnFsamRzbWF2cHFlZXZvc2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NzE2MjQsImV4cCI6MjA4MDA0NzYyNH0.CN2QyOvCcDNm2jNUxb8bgfJ7NZH230Jdil6iu9C2eA0` |
| **Decoded** | `{"iss":"supabase","ref":"khbqljdsmavpqeevosdb","role":"anon","iat":1764471624,"exp":2080047624}` |
| **Source** | `https://aicareerskills.netlify.app/assets/index-P00lu8LX.js` |

---

## TABLE SUMMARY

| Table | Row Count | Access Status | Data Type |
|-------|-----------|---------------|-----------|
| `admin_settings` | 1 | ✅ EXPOSED | Admin configuration |
| `client_research` | 4 | ✅ EXPOSED | AI-generated client research |
| `clients` | **81** | ✅ EXPOSED | Full client/prospect database |
| `contact_activities` | 0 | ✅ Accessible (empty) | Activity tracking |
| `contact_sequence_enrollments` | 0 | ✅ Accessible (empty) | Marketing sequences |
| `email_sequence_steps` | 0 | ✅ Accessible (empty) | Email automation |
| `email_sequences` | 0 | ✅ Accessible (empty) | Email campaigns |
| `portal_analytics` | 0 | ✅ Accessible (empty) | Analytics data |
| `portal_test_results` | 0 | ✅ Accessible (empty) | Test results |
| `portal_test_runs` | 0 | ✅ Accessible (empty) | Test runs |
| `profiles` | 1 | ✅ EXPOSED | User profiles |
| `skill_improvement_requests` | 0 | ✅ Accessible (empty) | Skill improvements |
| `skill_ratings` | 2 | ✅ EXPOSED | User ratings |
| `skill_registry` | 0 | ✅ Accessible (empty) | Skill definitions |
| `skill_tags` | 0 | ✅ Accessible (empty) | Skill tags |
| `skill_templates` | 2 | ✅ EXPOSED | Skill templates |
| `skill_version_history` | 0 | ✅ Accessible (empty) | Version history |
| `skills_needing_improvement` | 0 | ✅ Accessible (empty) | Improvement queue |
| `usage_logs` | 0 | ✅ Accessible (empty) | Usage tracking |
| `user_credits` | 0 | ✅ Accessible (empty) | Billing credits |
| `user_email_preferences` | 0 | ✅ Accessible (empty) | Email prefs |
| `user_onboarding` | 0 | ✅ Accessible (empty) | Onboarding data |
| `user_profiles` | - | 🔒 PROTECTED | RLS recursion error |

**TOTAL ROWS EXPOSED**: 90+

---

## COMPLETE DATA DUMP

### TABLE: admin_settings (1 row)

```json
[
  {
    "id": "default",
    "admin_emails": [
      "matthew.carlson.home@gmail.com"
    ],
    "created_at": "2026-01-18T20:07:14.2265+00:00",
    "updated_at": "2026-01-18T20:07:14.2265+00:00"
  }
]
```

### TABLE: profiles (1 row)

```json
[
  {
    "id": "d326b79c-919d-4bd5-a736-c5c6dda024f2",
    "display_name": "Matthew Carlson",
    "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLckkVQlbuGHEmPnBZTZHYVUQm81B-lvcJrkNl8GyNQLe_0nJ39=s96-c",
    "created_at": "2025-11-30T14:20:04.255624+00:00",
    "is_admin": true
  }
]
```

### TABLE: skill_templates (2 rows)

```json
[
  {
    "id": "7bead821-47fa-47a8-90d4-cd93e1d46a4f",
    "created_by": "d326b79c-919d-4bd5-a736-c5c6dda024f2",
    "name": "Meeting Summary Generator",
    "description": "Generates a concise summary of a meeting, highlighting key decisions, action items, and next steps.",
    "long_description": "This skill analyzes meeting transcripts or notes to produce a structured summary. It identifies key discussion points, decisions made, assigned action items, and planned next steps, saving you time and ensuring important details are captured.",
    "category": "productivity",
    "system_prompt_template": "You are a meeting summary assistant. Analyze the following meeting transcript/notes and generate a concise summary including:\n\n1. **Key Discussion Points** - Main topics discussed\n2. **Decisions Made** - Clear decisions reached\n3. **Action Items** - Tasks assigned with owners (if mentioned)\n4. **Next Steps** - Planned follow-up actions\n\nMeeting content:\n{{MEETING_CONTENT}}",
    "user_prompt_template": "Please summarize this meeting:\n\n{{MEETING_CONTENT}}",
    "input_schema": {
      "type": "object",
      "properties": {
        "MEETING_CONTENT": {
          "type": "string",
                          "description": "The meeting transcript or notes"
        }
      },
      "required": ["MEETING_CONTENT"]
    },
    "tags": ["meeting", "productivity", "summary"],
    "is_public": true,
    "use_count": 0,
    "avg_rating": null,
    "version_number": 1,
    "created_at": "2025-11-30T14:20:06.913388+00:00",
    "updated_at": "2025-11-30T14:20:06.913388+00:00"
  },
  {
    "id": "f600ba4c-4a06-41ed-87b6-faeed4677faf",
    "created_by": "d326b79c-919d-4bd5-a736-c5c6dda024f2",
    "name": "Senior Marketing Analyst Skill",
    "description": "Takes an input brief and produces a project plan for execution then as much as possible creates artifacts to assist with completion.",
    "long_description": "An advanced marketing analysis skill that creates comprehensive project plans and generates supporting artifacts including reports, dashboards, presentations, and strategic recommendations.",
    "category": "marketing",
    "system_prompt_template": "You are a Senior Marketing Analyst with expertise in:\n- Market research and competitive analysis\n- Campaign strategy and execution\n- Data analytics and visualization\n- Customer insights and segmentation\n- ROI analysis and performance tracking\n\nWhen given a project brief, you should:\n1. Ask clarifying questions if needed\n2. Create a detailed project plan\n3. Generate relevant artifacts (reports, dashboards, etc.)\n4. Provide strategic recommendations",
    "user_prompt_template": "Project Brief:\n{{PROJECT_BRIEF}}\n\nPlease analyze this request and provide a comprehensive project plan with supporting artifacts.",
    "input_schema": {
      "type": "object",
      "properties": {
        "PROJECT_BRIEF": {
          "type": "string",
          "description": "The project requirements and context"
        }
      },
      "required": ["PROJECT_BRIEF"]
    },
    "tags": ["marketing", "analytics", "strategy"],
    "is_public": true,
    "use_count": 0,
    "avg_rating": null,
    "version_number": 1,
    "created_at": "2025-11-30T14:20:06.913388+00:00",
    "updated_at": "2025-11-30T14:20:06.913388+00:00"
  }
]
```

### TABLE: skill_ratings (2 rows)

```json
[
  {
    "id": "ede034d7-290d-4595-9e0d-c9db7c3e9455",
    "skill_id": "7bead821-47fa-47a8-90d4-cd93e1d46a4f",
    "user_id": "d326b79c-919d-4bd5-a736-c5c6dda024f2",
    "rating": 4,
    "created_at": "2025-11-30T14:59:01.263722+00:00"
  },
  {
    "id": "fcb44bd2-77ce-4e02-be6b-1316a34a7eab",
    "skill_id": "f600ba4c-4a06-41ed-87b6-faeed4677faf",
    "user_id": "d326b79c-919d-4bd5-a736-c5c6dda024f2",
    "rating": 4,
    "created_at": "2025-11-30T23:06:18.375805+00:00"
  }
]
```

### TABLE: client_research (4 rows)

```json
[
  {
    "id": "055e6ced-897f-4e74-aaf3-05c455281029",
    "client_id": "04871a84-26af-4816-9399-5be75a615dbb",
    "research_type": "pain_points",
    "raw_data": {
      "painPoints": [
        "Limited resources for managing multiple client campaigns simultaneously.",
        "Difficulty in tracking and analyzing the effectiveness of various marketing strategies.",
        "Challenges in maintaining consistent brand messaging across different platforms.",
        "Time-consuming manual processes in reporting and data collection.",
        "Struggles with client communication and expectation management due to varying project timelines."
      ],
      "keyUseCases": [
        "Automated social media management and scheduling using AI tools.",
        "Real-time data analysis for campaign performance improvement.",
        "Personalized marketing campaigns driven by AI algorithms analyzing customer data.",
        "Dynamic website content personalization based on user behavior and preferences.",
        "AI-enhanced market research tools to identify emerging trends and consumer insights."
      ],
      "opportunities": [
        "AI-driven analytics tools to automate performance tracking and reporting.",
        "Chatbots for enhanced client communication and immediate feedback collection.",
        "AI-based content generation tools to streamline branding and marketing material creation.",
        "Predictive analytics to optimize marketing strategies based on consumer behavior.",
        "Automated project management systems to improve workflow efficiency and collaboration."
      ],
      "suggestedApproach": "Engage potential clients with case studies showcasing successful AI implementations in marketing, highlighting the efficiency and effectiveness of AI solutions. Offer free consultations to discuss specific pain points and how AI can address them."
    },
    "summary": "Engage potential clients with case studies showcasing successful AI implementations in marketing, highlighting the efficiency and effectiveness of AI solutions. Offer free consultations to discuss specific pain points and how AI can address them.",
    "key_insights": [
      "Pain: Limited resources for managing multiple client campaigns simultaneously.",
      "Pain: Difficulty in tracking and analyzing the effectiveness of various marketing strategies.",
      "Pain: Challenges in maintaining consistent brand messaging across different platforms.",
      "Opportunity: AI-driven analytics tools to automate performance tracking and reporting.",
      "Opportunity: Chatbots for enhanced client communication and immediate feedback collection."
    ],
    "suggested_skills": [
      "excel-marketing-dashboard",
      "ab-test-analysis-reporter",
      "email-sequence-creator",
      "content-calendar-planner",
      "sales-call-prep-pro",
      "competitive-landscape-mapper",
      "product-launch-checklist",
      "performance-review-assistant",
      "ai-use-case-evaluator"
    ],
    "suggested_workflows": [
      "marketing-campaign",
      "brand-development",
      "competitive-intelligence"
    ],
    "confidence_score": null,
    "source_url": null,
    "source_name": "ai_analysis",
    "researched_at": "2026-01-21T20:23:27.996+00:00",
    "expires_at": null
  },
  {
    "id": "3182df3c-1409-4ede-9087-b9506e0ffd30",
    "client_id": "288804cb-3c8d-41df-bfe3-79dd628bf1ce",
    "research_type": "pain_points",
    "raw_data": {
      "painPoints": [
        "Difficulty in tracking and analyzing campaign performance metrics effectively.",
        "Challenges in managing client communications and expectations.",
        "Limited resources for conducting market research and competitor analysis.",
        "Inefficiencies in lead generation and client acquisition processes.",
        "Struggles with maintaining consistent branding and messaging across multiple platforms."
      ],
      "keyUseCases": [
        "Predictive analytics for forecasting campaign success based on historical data.",
        "Natural language processing for sentiment analysis on client feedback.",
        "Automation of social media management and content scheduling.",
        "AI-driven personalization engines for tailored marketing messages.",
        "Chatbot deployment for 24/7 client engagement and lead qualification."
      ],
      "opportunities": [
        "Implementing AI-driven analytics tools to automate campaign performance tracking.",
        "Utilizing chatbots for improved client communication and support.",
        "Leveraging AI for market analysis to identify emerging trends and consumer behavior.",
        "Automating lead scoring and nurturing processes to enhance client acquisition.",
        "Using AI for personalized marketing strategies to improve customer engagement."
      ],
      "suggestedApproach": "Engage through targeted email campaigns highlighting AI solutions tailored for marketing challenges, offering free consultations or demos to showcase potential benefits."
    },
    "summary": "Engage through targeted email campaigns highlighting AI solutions tailored for marketing challenges, offering free consultations or demos to showcase potential benefits.",
    "key_insights": [
      "Pain: Difficulty in tracking and analyzing campaign performance metrics effectively.",
      "Pain: Challenges in managing client communications and expectations.",
      "Pain: Limited resources for conducting market research and competitor analysis.",
      "Opportunity: Implementing AI-driven analytics tools to automate campaign performance tracking.",
      "Opportunity: Utilizing chatbots for improved client communication and support."
    ],
    "suggested_skills": [
      "excel-marketing-dashboard",
      "ab-test-analysis-reporter",
      "competitive-landscape-mapper",
      "product-launch-checklist",
      "market-entry-assessment",
      "email-sequence-creator",
      "sales-call-prep-pro",
      "proposal-builder",
      "content-calendar-planner"
    ],
    "suggested_workflows": [
      "marketing-campaign",
      "consulting-engagement",
      "competitive-intelligence"
    ],
    "confidence_score": null,
    "source_url": null,
    "source_name": "ai_analysis",
    "researched_at": "2026-01-21T20:32:47.604+00:00",
    "expires_at": null
  },
  {
    "id": "8d640b09-f396-49f8-88d1-6009bed27d29",
    "client_id": "d2a94619-273d-475d-acec-52d6634b08cd",
    "research_type": "pain_points",
    "raw_data": {
      "painPoints": [
        "Limited resources leading to potential burnout among a small team of employees",
        "Challenges in scaling content production without sacrificing quality",
        "Difficulty in measuring the effectiveness of content marketing efforts",
        "Balancing multiple client projects with varying demands and timelines",
        "Staying updated with rapidly changing marketing trends and technologies"
      ],
      "keyUseCases": [
        "AI-powered content creation tools to assist in generating blog posts, white papers, and social media content",
        "Predictive analytics for forecasting content performance and client engagement",
        "Natural language processing to analyze customer feedback and improve content strategy",
        "Automated A/B testing for optimizing content delivery and engagement strategies",
        "AI-driven insights for identifying trending topics and content gaps in the market"
      ],
      "opportunities": [
        "Automating content analytics to provide real-time insights into campaign performance.",
        "Leveraging AI for content generation to enhance productivity and creativity.",
        "Implementing AI-driven customer segmentation to tailor marketing strategies.",
        "Using chatbots for initial client interactions to streamline communication.",
        "Automating reporting processes to save time on performance analysis."
      ],
      "suggestedApproach": "Utilize a targeted email outreach campaign highlighting the benefits of AI automation in content marketing, focusing on efficiency, scalability, and improved analytics capabilities. Include case studies and examples of successful implementations."
    },
    "summary": "Utilize a targeted email outreach campaign highlighting the benefits of AI automation in content marketing, focusing on efficiency, scalability, and improved analytics capabilities. Include case studies and examples of successful implementations.",
    "key_insights": [
      "Pain: Limited resources leading to potential burnout among a small team of employees",
      "Pain: Challenges in scaling content production without sacrificing quality",
      "Pain: Difficulty in measuring the effectiveness of content marketing efforts",
      "Opportunity: Automating content analytics to provide real-time insights into campaign performance",
      "Opportunity: Leveraging AI for content generation to enhance productivity and creativity"
    ],
    "suggested_skills": [
      "content-calendar-planner",
      "excel-marketing-dashboard",
      "seo-content-optimizer",
      "ab-test-analysis-reporter",
      "competitive-landscape-mapper",
      "excel-data-analyzer",
      "market-entry-assessment",
      "sales-call-prep-pro",
      "market-sizing-analyst"
    ],
    "suggested_workflows": [
      "marketing-campaign",
      "competitive-intelligence",
      "brand-development"
    ],
    "confidence_score": null,
    "source_url": null,
    "source_name": "ai_analysis",
    "researched_at": "2026-01-22T18:54:27.499+00:00",
    "expires_at": null
  },
  {
    "id": "05b8fcf4-78ef-4583-8c35-f23d28b212f9",
    "client_id": "12ccaef6-dc4e-413f-987d-c9c57ba74a4d",
    "research_type": "pain_points",
    "raw_data": {
      "painPoints": [
        "Limited employee bandwidth leading to project delays",
        "Difficulty in analyzing and interpreting large amounts of market data",
        "Challenges in maintaining consistent brand messaging across multiple platforms",
        "Client communication and feedback management inefficiencies",
        "Resource allocation issues during peak project times"
      ],
      "keyUseCases": [
        "Automated content generation for marketing materials and social media",
        "AI-powered market research and competitive analysis tools",
        "Intelligent CRM systems that prioritize leads and automate follow-ups",
        "Dynamic personalization engines for email and web content",
        "Predictive analytics for forecasting market trends and customer behavior"
      ],
      "opportunities": [
        "AI-driven content creation to reduce manual workload",
        "Automated market research and data analysis",
        "Enhanced client communication through AI-powered chatbots",
        "Improved resource allocation with predictive analytics",
        "Streamlined feedback collection and analysis"
      ],
      "suggestedApproach": "Position AI as a solution for bandwidth constraints and market research challenges. Offer demonstrations of content generation and analytics tools that can immediately impact their productivity."
    },
    "summary": "Position AI as a solution for bandwidth constraints and market research challenges. Offer demonstrations of content generation and analytics tools that can immediately impact their productivity.",
    "key_insights": [
      "Pain: Limited employee bandwidth leading to project delays",
      "Pain: Difficulty in analyzing and interpreting large amounts of market data",
      "Pain: Challenges in maintaining consistent brand messaging across multiple platforms",
      "Opportunity: AI-driven content creation to reduce manual workload",
      "Opportunity: Automated market research and data analysis"
    ],
    "suggested_skills": [
      "excel-marketing-dashboard",
      "content-calendar-planner",
      "competitive-landscape-mapper",
      "market-entry-assessment",
      "sales-call-prep-pro",
      "proposal-builder",
      "email-sequence-creator"
    ],
    "suggested_workflows": [
      "marketing-campaign",
      "competitive-intelligence",
      "consulting-engagement"
    ],
    "confidence_score": null,
    "source_url": null,
    "source_name": "ai_analysis",
    "researched_at": "2026-01-22T19:02:37.880637+00:00",
    "expires_at": null
  }
]
```

---

## TABLE: clients (81 rows)

**Full dump available in**: `table_dump.txt`

**Schema** (32 columns):
- id, company_name, industry, website, description
- company_type, services, revenue, employee_count, location
- priority, estimated_time_savings, estimated_cost_savings
- pain_points, contacts, selected_skill_ids, selected_workflow_ids
- custom_headline, custom_message, portal_slug, portal_enabled
- status, notes, created_at, updated_at, last_contacted_at
- logo_url, linkedin_url, company_technical_info, key_use_cases

**Sample Record**:
```json
{
  "id": "6d322bcc-1f0c-4850-943e-5d937819df38",
  "company_name": "The Creative Company",
  "industry": "marketing_advertising",
  "website": "thecreativecompany.com",
  "description": "Founded 1989/1991, 34+ years. Strong nonprofit/cause marketing focus. BBB A+ rated. PR and digital hybrid.",
  "company_type": "PR & Digital Agency",
  "services": "PR, Website Design, Social Media, Email Marketing, Branding, Content Strategy",
  "revenue": "$1-3M",
  "employee_count": "10-12",
  "location": "Madison, WI",
  "priority": "MEDIUM",
  "estimated_time_savings": "10-16 hrs",
  "estimated_cost_savings": "$2,500-$6,400",
  "pain_points": "PR monitoring and reporting, social media workflows, email campaign tracking, nonprofit reporting",
  "contacts": [],
  "selected_skill_ids": [
    "ab-test-analysis-reporter",
    "all-hands-meeting-script",
    "crisis-communication-playbook",
    "customer-health-scorecard",
    "excel-marketing-dashboard",
    "executive-communication-pack",
    "kpi-framework-designer",
    "meeting-minutes-pro",
    "proposal-builder"
  ],
  "selected_workflow_ids": [
    "competitive-intelligence",
    "consulting-engagement",
    "marketing-campaign-launch"
  ],
  "custom_headline": "Cause Marketing + AI: Amplify Your Nonprofit Impact",
  "custom_message": "For 34+ years, you've championed nonprofits and cause marketing with BBB A+ quality. Now amplify that impact with AI skills for PR monitoring, social workflows, and nonprofit-specific reporting—helping your clients tell their stories more effectively than ever.",
  "portal_slug": "the-creative-company",
  "portal_enabled": true,
  "status": "prospect",
  "notes": null,
  "created_at": "2026-01-18T20:29:13.108+00:00",
  "updated_at": "2026-01-21T20:26:37.27517+00:00",
  "last_contacted_at": null,
  "logo_url": "https://logo.clearbit.com/thecreativecompany.com",
  "linkedin_url": "https://www.linkedin.com/company/the-creative-company/",
  "company_technical_info": null,
  "key_use_cases": []
}
```

**Industries Represented**:
- Marketing & Advertising Agencies
- PR Firms
- Digital Agencies
- Content Marketing
- Nonprofit Marketing
- B2B Marketing

**Status Distribution**:
- prospect
- contacted
- qualified
- closed_won
- closed_lost

---

## ANALYSIS

### Data Characteristics

**This appears to be DEMO/TEST DATA** because:
1. Generic pain points and research summaries (AI-generated)
2. Sample skill templates (Meeting Summary, Marketing Analyst)
3. Test admin account (matthew.carlson.home@gmail.com)
4. No real PII (personally identifiable information) beyond names/emails
5. Standard sales prospecting data structure

### Risk Assessment

| Risk | Severity | Notes |
|------|----------|-------|
| **Credential Exposure** | 🔴 CRITICAL | Supabase anon key embedded in client-side JS |
| **Database Schema Exposed** | 🟡 MEDIUM | Full table structure visible via OpenAPI |
| **Demo Data Exposure** | 🟢 LOW | Appears to be test data, not real customer PII |
| **Admin Email Exposed** | 🟡 MEDIUM | Could be used for social engineering |

### Security Findings

**GOOD**:
- No production PII exposed (appears to be demo data)
- RPC functions properly restrict admin operations
- Security headers properly configured

**NEEDS FIXING**:
1. Supabase anon key should not be in client-side bundle
2. RLS policies should be reviewed (clients table fully readable)
3. Consider moving API calls through backend proxy

---

## REMEDIATION RECOMMENDATIONS

### Immediate (Critical)
1. **Remove Supabase credentials from client-side code**
   - Move to environment variables
   - Use Netlify Functions as API proxy layer

2. **Review RLS policies on sensitive tables**
   - `clients` table should not be publicly readable
   - `admin_settings` should be admin-only
   - `client_research` should be restricted

### Short-term (High)
3. **Rotate exposed Supabase anon key**
4. **Implement proper authentication check**
5. **Add rate limiting to API endpoints**

### Long-term (Medium)
6. **Implement service-layer architecture**
7. **Add audit logging for data access**
8. **Regular security audits**

---

## ADDITIONAL FILES

- **Full JSON dump**: `table_dump.txt` (4,599 lines)
- **Raw API responses**: Available in `/tmp/table_dump.txt`

---

## TEST COMMANDS

To verify exposure:

```bash
# Test admin_settings
curl -s "https://khbqljdsmavpqeevosdb.supabase.co/rest/v1/admin_settings" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYnFsamRzbWF2cHFlZXZvc2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NzE2MjQsImV4cCI6MjA4MDA0NzYyNH0.CN2QyOvCcDNm2jNUxb8bgfJ7NZH230Jdil6iu9C2eA0" | jq .

# Count clients
curl -s "https://khbqljdsmavpqeevosdb.supabase.co/rest/v1/clients?select=count" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYnFsamRzbWF2cHFlZXZvc2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NzE2MjQsImV4cCI6MjA4MDA0NzYyNH0.CN2QyOvCcDNm2jNUxb8bgfJ7NZH230Jdil6iu9C2eA0" \
  -H "Prefer: count=exact" -I | grep content-range
```

---

**Report Generated**: 2026-01-23
**Scanner**: Automated Security Assessment Tool
