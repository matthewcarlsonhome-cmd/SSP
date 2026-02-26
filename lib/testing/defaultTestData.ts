/**
 * defaultTestData.ts - Default Test Data for Skills and Workflows
 *
 * Provides pre-defined test data for every skill and workflow that can be:
 * - Loaded into form fields via "Test Output" buttons
 * - Used by automated tests and the Developer Playground
 * - Extended with additional test cases
 *
 * Each skill has a "default" test case (usually the first happy-path) that is
 * used for quick testing via the UI "Test Output" button.
 */

import type { TestCase, SkillTestSuite, WorkflowTestSuite } from './testCaseGenerator';
import { ROLE_TEMPLATE_DEFAULT_TEST_DATA } from './roleTemplateTestData';
import { PROMPT_ENGINEERING_DEFAULT_TEST_DATA } from './promptEngineeringTestData';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SkillDefaultTestData {
  skillId: string;
  defaultTestCaseId: string;
  description: string;
  inputPayload: Record<string, string>;
}

export interface WorkflowDefaultTestData {
  workflowId: string;
  defaultTestCaseId: string;
  description: string;
  inputPayload: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED TEST DATA TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const SAMPLE_RESUME = `PROFESSIONAL SUMMARY
Results-driven software professional with 6+ years of experience in full-stack development and team leadership. Proven track record of delivering scalable solutions that drive business growth. Strong background in agile methodologies and cross-functional collaboration.

EXPERIENCE

Senior Software Engineer, TechScale Solutions, 2021-Present
- Led development of microservices platform handling 1.5M daily transactions
- Reduced API response times by 45% through performance optimization
- Mentored team of 5 junior developers, conducting weekly code reviews
- Implemented CI/CD pipelines reducing deployment time from 4 hours to 15 minutes

Software Engineer, StartupGrow Inc, 2018-2021
- Built customer portal used by 50,000+ monthly active users
- Developed real-time notification system using WebSockets
- Collaborated with product team on feature prioritization and roadmap
- Created internal tools that saved 10+ engineering hours per week

Junior Developer, WebAgency Co, 2017-2018
- Developed responsive websites for 20+ clients
- Maintained legacy PHP applications
- Assisted senior developers with database optimization

EDUCATION
B.S. Computer Science, State University, 2017
Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering

TECHNICAL SKILLS
Languages: TypeScript, Python, JavaScript, SQL, Go
Frameworks: React, Node.js, Express, Django, FastAPI
Cloud: AWS (EC2, Lambda, RDS, S3), Docker, Kubernetes
Tools: Git, GitHub Actions, Terraform, DataDog

CERTIFICATIONS
- AWS Solutions Architect Associate (2023)
- Certified Scrum Master (2022)`;

const SAMPLE_JOB_DESCRIPTION = `SENIOR SOFTWARE ENGINEER

About TechForward Inc:
TechForward is a fast-growing B2B SaaS company revolutionizing how enterprises manage their data infrastructure. We've raised $75M Series C and serve 500+ enterprise customers globally.

About the Role:
We're seeking a Senior Software Engineer to join our Platform team. You'll design and build core infrastructure powering our product, working closely with product and design to deliver exceptional user experiences.

What You'll Do:
- Design and implement scalable, reliable backend services
- Lead technical architecture discussions and code reviews
- Mentor junior engineers and contribute to engineering culture
- Collaborate with cross-functional teams on product features
- Own end-to-end delivery of major platform initiatives

Requirements:
- 5+ years of software engineering experience
- Strong proficiency in one or more backend languages (Python, Go, Java, TypeScript)
- Experience with cloud platforms (AWS, GCP, or Azure)
- Solid understanding of distributed systems and microservices
- Experience with databases (PostgreSQL, Redis, MongoDB)
- Strong communication and collaboration skills

Nice to Have:
- Experience with Kubernetes and container orchestration
- Background in developer tools or infrastructure
- Contributions to open-source projects

Benefits:
- Competitive salary: $180,000-$220,000 + equity
- Remote-first with optional office in SF and NYC
- Unlimited PTO and flexible working hours
- $5,000 annual learning budget
- Comprehensive health, dental, vision coverage
- 401(k) with 4% company match

TechForward is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment.`;

const SAMPLE_LINKEDIN_PROFILE = `HEADLINE
Senior Software Engineer | Building Scalable Systems | AWS Certified | Open Source Contributor

ABOUT
I'm a software engineer passionate about building products that scale. Over the past 6 years, I've worked across the stack, from designing microservices architectures to crafting intuitive user interfaces.

Currently, I'm focused on platform engineering at TechScale Solutions, where I lead initiatives to improve system reliability and developer experience. I'm particularly interested in distributed systems, developer tooling, and the intersection of engineering and product.

When I'm not coding, I contribute to open-source projects and write about software architecture on my blog. I'm always open to connecting with fellow engineers and discussing interesting technical challenges.

EXPERIENCE
Senior Software Engineer at TechScale Solutions (3 years)
Software Engineer at StartupGrow Inc (3 years)
Junior Developer at WebAgency Co (1 year)

EDUCATION
B.S. Computer Science, State University

SKILLS
TypeScript, Python, React, Node.js, AWS, Kubernetes, PostgreSQL, System Design`;

// ═══════════════════════════════════════════════════════════════════════════
// JOB SEEKER SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const JOB_SEEKER_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'job-readiness-score': {
    skillId: 'job-readiness-score',
    defaultTestCaseId: 'job-readiness-default-1',
    description: 'Senior Software Engineer applying to B2B SaaS company',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      userBackground: SAMPLE_RESUME,
      additionalContext: 'I have been in my current role for 3 years and am looking for a more senior position with greater impact. My primary motivation is to work on larger-scale distributed systems.',
    },
  },

  'skills-gap-analyzer': {
    skillId: 'skills-gap-analyzer',
    defaultTestCaseId: 'skills-gap-default-1',
    description: 'Analyzing skills gap for Platform Engineering role',
    inputPayload: {
      jobTitle: 'Senior Platform Engineer',
      companyName: 'CloudScale Solutions',
      jobDescription: `SENIOR PLATFORM ENGINEER

We're looking for a Senior Platform Engineer to design and maintain our cloud infrastructure supporting 10M+ daily API calls.

Requirements:
- 5+ years experience with cloud platforms (AWS/GCP)
- Strong Kubernetes and container orchestration expertise
- Experience with Terraform or similar IaC tools
- Background in building developer platforms and tooling
- Experience with observability stack (Prometheus, Grafana, DataDog)
- Strong Python or Go programming skills

Nice to have:
- Experience with service mesh (Istio, Linkerd)
- Background in platform as a service (PaaS) development
- Contributions to CNCF projects`,
      userBackground: SAMPLE_RESUME,
      timeline: 'Applying in 3 weeks',
    },
  },

  'linkedin-optimizer-pro': {
    skillId: 'linkedin-optimizer-pro',
    defaultTestCaseId: 'linkedin-optimizer-default-1',
    description: 'Optimizing LinkedIn profile for engineering leadership roles',
    inputPayload: {
      jobTitleTarget: 'Engineering Manager, Technical Lead',
      industry: 'B2B SaaS / Developer Tools',
      currentLinkedinProfile: SAMPLE_LINKEDIN_PROFILE,
      userBackground: SAMPLE_RESUME,
      jobDescription: SAMPLE_JOB_DESCRIPTION,
    },
  },

  'ats-optimization-checker': {
    skillId: 'ats-optimization-checker',
    defaultTestCaseId: 'ats-checker-default-1',
    description: 'Checking resume ATS compatibility for tech role',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      userBackground: SAMPLE_RESUME,
    },
  },

  'resume-customizer': {
    skillId: 'resume-customizer',
    defaultTestCaseId: 'resume-customizer-default-1',
    description: 'Customizing resume for Senior Software Engineer position',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      userBackground: SAMPLE_RESUME,
      additionalContext: 'Want to emphasize my experience with microservices and team leadership. Currently at TechScale Solutions for 3 years.',
    },
  },

  'cover-letter-generator': {
    skillId: 'cover-letter-generator',
    defaultTestCaseId: 'cover-letter-default-1',
    description: 'Generating cover letter for B2B SaaS company',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      userBackground: SAMPLE_RESUME,
      additionalContext: 'I discovered TechForward through their engineering blog posts about event-driven architecture. Their approach to solving complex data problems aligns with my interests.',
    },
  },

  'networking-script-generator': {
    skillId: 'networking-script-generator',
    defaultTestCaseId: 'networking-default-1',
    description: 'Creating networking scripts for informational interviews',
    inputPayload: {
      networkingScenario: 'Informational Interview',
      targetPerson: 'Jane Chen, Senior Engineering Manager at TechForward Inc. We attended the same university (State University) and she spoke at a recent tech meetup I attended about scaling engineering teams.',
      jobTitleTarget: 'Transition into Engineering Management',
      userBackground: SAMPLE_RESUME,
      specificGoal: 'Learn about the engineering culture and what qualities they look for in engineering managers. Also understand the career path from senior IC to management.',
    },
  },

  'company-research': {
    skillId: 'company-research',
    defaultTestCaseId: 'company-research-default-1',
    description: 'Researching B2B SaaS company before interview',
    inputPayload: {
      companyName: 'TechForward Inc',
      roleApplying: 'Senior Software Engineer',
      userBackground: SAMPLE_RESUME,
      specificQuestions: 'What is their tech stack? What is the engineering culture like? What are their growth plans? Who are their main competitors?',
    },
  },

  'interview-prep': {
    skillId: 'interview-prep',
    defaultTestCaseId: 'interview-prep-default-1',
    description: 'Preparing for technical interview at B2B SaaS company',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      userBackground: SAMPLE_RESUME,
      interviewType: 'Technical + Behavioral',
      additionalContext: 'The recruiter mentioned there will be a system design round focused on data pipelines, plus a behavioral round with the hiring manager.',
    },
  },

  'thank-you-note-generator': {
    skillId: 'thank-you-note-generator',
    defaultTestCaseId: 'thank-you-default-1',
    description: 'Generating thank you note after technical interview',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      interviewerDetails: `Sarah Chen, Engineering Manager - Discussed architecture of event-driven system and data consistency across microservices. Mentioned scaling to support 10x traffic growth.

Michael Rodriguez, Senior Staff Engineer - Deep dive on system design for their data pipeline. Explored trade-offs between consistency and availability.

Lisa Park, VP of Engineering - Culture and team dynamics discussion. Talked about their mentorship program and career growth paths.`,
      interviewHighlights: 'The interview went well overall. I felt particularly strong on the system design portion where I proposed a CQRS pattern that Sarah seemed interested in. Michael was engaged when I discussed my experience with event sourcing.',
      additionalContext: 'I mentioned my experience leading the migration project at TechScale, which seemed to resonate with their current scaling challenges.',
    },
  },

  'offer-evaluation-pro': {
    skillId: 'offer-evaluation-pro',
    defaultTestCaseId: 'offer-eval-default-1',
    description: 'Evaluating job offer from B2B SaaS company',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      location: 'San Francisco, CA (Remote-first)',
      offerDetails: `Base Salary: $195,000/year
Bonus: 15% target bonus (paid annually)
Equity: 0.05% equity vesting over 4 years with 1-year cliff
Benefits:
- Comprehensive health/dental/vision coverage
- 401k with 4% company match
- Unlimited PTO policy
- $5,000 annual learning budget
- $1,500 home office stipend
- Flexible remote work policy`,
      currentCompensation: 'Currently making $175,000 base + 10% bonus at TechScale Solutions.',
      otherOffers: 'Also have an offer from DataScale Corp: $185,000 base, 10% bonus, 0.03% equity, standard benefits. DataScale is more established but slower growth.',
      careerGoals: 'My top priorities are: 1) Growth potential and learning opportunities, 2) Work-life balance, 3) Total compensation.',
    },
  },

  'salary-negotiation-master': {
    skillId: 'salary-negotiation-master',
    defaultTestCaseId: 'salary-neg-default-1',
    description: 'Preparing salary negotiation for senior engineer role',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      location: 'San Francisco, CA',
      offerDetails: `Base Salary: $195,000/year
Bonus: 15% target bonus
Equity: 0.05% over 4 years with 1-year cliff
Sign-on: None offered
Start Date: January 15, 2025`,
      userBackground: SAMPLE_RESUME,
      currentCompensation: 'Currently at $175,000 base + 10% bonus at TechScale Solutions. Been in role 3 years with strong performance reviews.',
      competingOffers: 'DataScale Corp: $185,000 base, 10% bonus, 0.03% equity. More established company but slower growth trajectory.',
    },
  },

  'onboarding-accelerator-pro': {
    skillId: 'onboarding-accelerator-pro',
    defaultTestCaseId: 'onboarding-default-1',
    description: 'Planning 90-day onboarding for new senior engineer role',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      startDate: 'January 15, 2025',
      teamInfo: 'Joining the Platform team of 8 engineers. My manager is Sarah Chen (Engineering Manager). The team is responsible for core infrastructure including API gateway, service mesh, and developer tooling.',
      userBackground: SAMPLE_RESUME,
      personalGoals: 'I want to ship meaningful code in my first month, build relationships with key stakeholders, and understand the architectural decisions behind the platform. Long-term, I am interested in taking on tech lead responsibilities.',
      knownChallenges: 'The codebase is large with some legacy components. The team has been working on a major migration project that I will likely join.',
    },
  },

  'day-in-the-life-generator': {
    skillId: 'day-in-the-life-generator',
    defaultTestCaseId: 'day-in-life-default-1',
    description: 'Understanding daily life as Senior Software Engineer',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      industry: 'B2B SaaS',
      companySize: 'Mid-size (200-500 employees)',
      userBackground: SAMPLE_RESUME,
    },
  },

  'role-ai-automation-analyzer': {
    skillId: 'role-ai-automation-analyzer',
    defaultTestCaseId: 'ai-automation-default-1',
    description: 'Analyzing AI automation potential for software engineering',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      industry: 'B2B SaaS',
      currentSkills: 'Full-stack development (TypeScript, Python, React), system design, code review, mentoring junior developers, technical documentation, sprint planning',
      additionalContext: 'I am curious about how AI tools like GitHub Copilot and ChatGPT might change the software engineering role over the next 5 years.',
    },
  },

  'healthcare-resume-parser': {
    skillId: 'healthcare-resume-parser',
    defaultTestCaseId: 'healthcare-resume-default-1',
    description: 'Parsing healthcare professional resume',
    inputPayload: {
      userBackground: `REGISTERED NURSE - BSN, RN

PROFESSIONAL SUMMARY
Compassionate and detail-oriented Registered Nurse with 5+ years of experience in acute care settings. Specialized in cardiac care with expertise in patient assessment, care planning, and family education. Strong advocate for patient safety and evidence-based practice.

LICENSURE & CERTIFICATIONS
- Registered Nurse, State Board of Nursing (Active)
- Basic Life Support (BLS) - American Heart Association
- Advanced Cardiac Life Support (ACLS) - American Heart Association
- Certified Critical Care Nurse (CCRN) - AACN

CLINICAL EXPERIENCE

Staff Nurse - Cardiac ICU, Metro General Hospital, 2020-Present
- Provide specialized care for post-cardiac surgery and acute MI patients
- Manage continuous cardiac monitoring for unit of 12 patients
- Precept new graduate nurses and nursing students
- Participate in rapid response and code blue teams
- Champion for unit-based falls prevention committee

Staff Nurse - Medical-Surgical Unit, Community Hospital, 2018-2020
- Managed care for 6-8 patients with diverse diagnoses
- Collaborated with interdisciplinary team for discharge planning
- Implemented evidence-based practice for pressure ulcer prevention

EDUCATION
Bachelor of Science in Nursing (BSN), State University, 2018
GPA: 3.7/4.0 | Dean's List

SKILLS
- Electronic Health Records: Epic, Cerner
- Clinical: Cardiac monitoring, ventilator management, IV therapy, medication administration
- Languages: English (native), Spanish (conversational)`,
      targetRole: 'ICU Nurse - Travel Position',
      additionalContext: 'Looking to transition to travel nursing. Interested in Level 1 trauma centers and academic medical centers.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTERPRISE SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const ENTERPRISE_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'contract-review-accelerator': {
    skillId: 'contract-review-accelerator',
    defaultTestCaseId: 'contract-review-default-1',
    description: 'Reviewing SaaS vendor agreement',
    inputPayload: {
      contractText: `SOFTWARE AS A SERVICE AGREEMENT

This Software as a Service Agreement ("Agreement") is entered into as of January 1, 2025 ("Effective Date") by and between:

CloudVendor Inc., a Delaware corporation ("Provider")
AND
Enterprise Customer Corp., a California corporation ("Customer")

1. SERVICES
Provider shall provide Customer with access to its cloud-based analytics platform ("Service") as described in Exhibit A.

2. TERM AND RENEWAL
Initial term: 36 months from Effective Date
Auto-renewal: Annual periods unless either party provides 90 days written notice

3. FEES AND PAYMENT
Annual subscription fee: $150,000 USD
Payment terms: Net 30 from invoice date
Annual price increase: Up to 7% upon renewal

4. DATA RIGHTS
4.1 Customer Data remains Customer's property
4.2 Provider may use anonymized, aggregated data for product improvement
4.3 Provider shall not sell Customer Data to third parties

5. SERVICE LEVELS
Availability: 99.5% monthly uptime
Support: 24/7 for critical issues, business hours for standard
Credits: 10% monthly credit for each 1% below SLA

6. LIABILITY
Provider's total liability: Not to exceed fees paid in prior 12 months
Exclusions: Indirect, consequential, punitive damages

7. DATA SECURITY
SOC 2 Type II certified
Data encrypted at rest and in transit
Annual penetration testing

8. TERMINATION
For cause: 30 days notice for material breach
For convenience: Customer may terminate with 180 days notice and pro-rata refund

9. GOVERNING LAW
State of Delaware`,
      contractType: 'SaaS Vendor Agreement',
      reviewFocus: 'Identify unfavorable terms, missing protections, and negotiation opportunities. Focus on data security, liability, and termination provisions.',
      companyContext: 'We are a mid-size financial services company. This would be our primary analytics platform handling customer financial data. Budget for the project is $175,000 annually.',
    },
  },

  'budget-variance-narrator': {
    skillId: 'budget-variance-narrator',
    defaultTestCaseId: 'budget-variance-default-1',
    description: 'Explaining Q3 budget variances for engineering department',
    inputPayload: {
      budgetData: `ENGINEERING DEPARTMENT - Q3 2024 BUDGET VS ACTUAL

Category | Budget | Actual | Variance | Variance %
Personnel | $2,500,000 | $2,750,000 | ($250,000) | -10.0%
Cloud Infrastructure | $800,000 | $920,000 | ($120,000) | -15.0%
Software Licenses | $300,000 | $275,000 | $25,000 | 8.3%
Contractors | $400,000 | $580,000 | ($180,000) | -45.0%
Training & Development | $100,000 | $45,000 | $55,000 | 55.0%
Travel | $75,000 | $30,000 | $45,000 | 60.0%
Equipment | $150,000 | $200,000 | ($50,000) | -33.3%
Miscellaneous | $50,000 | $35,000 | $15,000 | 30.0%

TOTAL | $4,375,000 | $4,835,000 | ($460,000) | -10.5%

Additional Context:
- Headcount: Budgeted 45 FTE, Actual 48 FTE (3 unplanned hires)
- Major project: Platform migration project accelerated by 2 months
- Cloud costs: Unexpected traffic spike in August (+200%)`,
      audience: 'CFO and Finance Committee',
      analysisDepth: 'Executive summary with supporting details. Explain root causes, one-time vs recurring impacts, and forecast implications for Q4.',
      additionalContext: 'The platform migration was accelerated at CEO request to meet a key customer deadline. Training budget was deferred to Q4.',
    },
  },

  'steering-committee-pack': {
    skillId: 'steering-committee-pack',
    defaultTestCaseId: 'steering-committee-default-1',
    description: 'Preparing steering committee materials for platform modernization',
    inputPayload: {
      programName: 'Platform Modernization Initiative',
      programStatus: `PROGRAM STATUS SUMMARY

Overall Health: Yellow (At Risk)

Timeline: Original completion Dec 2025, current forecast Mar 2026 (+3 months)
Budget: $4.5M approved, $3.2M spent to date, $1.8M forecast to complete (10% over)
Scope: 85% of planned features, 2 features descoped, 1 added

Key Milestones:
- Phase 1 (Foundation): Complete ✓
- Phase 2 (Core Migration): 75% complete, 3 weeks behind
- Phase 3 (Integration): Not started, at risk
- Phase 4 (Cutover): Not started

Current Issues:
1. Legacy API compatibility taking longer than estimated
2. Key architect on medical leave for 6 weeks
3. Vendor dependency for integration module

Current Risks:
1. Holiday code freeze may impact timeline
2. Customer commitments dependent on new platform
3. Team burnout after sustained overtime`,
      keyMetrics: `Sprint Velocity: 45 points (target 50)
Defect Rate: 12 per sprint (target <10)
Test Coverage: 72% (target 80%)
Team Utilization: 95% (target 85%)`,
      risks: `R1: Schedule slip of 3+ months if integration delays continue (High likelihood, High impact)
R2: Budget overrun of 15-20% if contractor extension needed (Medium likelihood, Medium impact)
R3: Quality issues if testing compressed (Low likelihood, High impact)`,
      decisions: `D1: Approve additional $200K for contractor extension (Recommended: Yes)
D2: Defer Feature X to Phase 2 release (Recommended: Yes)
D3: Approve 2-week schedule buffer for integration testing (Recommended: Yes)`,
    },
  },

  'executive-communication-pack': {
    skillId: 'executive-communication-pack',
    defaultTestCaseId: 'exec-comm-default-1',
    description: 'Creating executive communication for major initiative',
    inputPayload: {
      topic: 'Launch of AI-Powered Customer Support Platform',
      keyMessage: 'We are launching an AI-powered customer support platform that will reduce response times by 60% and improve customer satisfaction scores. This represents a $2M investment with expected ROI of 300% over 3 years.',
      audience: 'Board of Directors, Executive Leadership Team, All Employees',
      context: 'We have been piloting AI support for 6 months with excellent results. The board previously approved the concept in Q2. This communication announces the full rollout.',
      tone: 'Professional, optimistic, acknowledging the journey ahead',
      supportingData: `Pilot Results (6 months):
- Response time: 4 hours → 1.5 hours (-62%)
- CSAT: 72 → 84 (+12 points)
- Ticket resolution rate: 68% → 82%
- Cost per ticket: $15 → $8 (-47%)
- Employee satisfaction with tools: 85% positive

Investment: $2M over 18 months
Expected savings: $6M over 3 years
Jobs impacted: 0 layoffs; 15 support agents retrained to handle escalations`,
      timing: 'Announce at all-hands meeting next Tuesday, board update Friday',
    },
  },

  'automation-opportunity-assessment': {
    skillId: 'automation-opportunity-assessment',
    defaultTestCaseId: 'automation-assessment-default-1',
    description: 'Assessing invoice processing for automation potential',
    inputPayload: {
      processName: 'Invoice Processing and Approval',
      processDescription: `Current Process:
1. Invoices arrive via email (60%), mail (30%), or vendor portal (10%)
2. AP clerk manually enters invoice data into ERP (15 min average)
3. Clerk matches invoice to PO in system (5 min)
4. If match, routes to budget owner for approval via email
5. Budget owner reviews and approves in ERP (variable, 1-5 days wait)
6. AP processes payment batch weekly

Volume: 2,500 invoices per month
Staff: 3 FTE AP clerks + 50 budget approvers
Error rate: 4% require rework
Current cost: $45 per invoice processed`,
      currentMetrics: `Processing time: 15-20 minutes per invoice
Approval cycle: 3-5 business days average
Error rate: 4% (data entry errors, wrong GL coding)
Late payment rate: 8% (vendor complaints)
Staff overtime: 15 hours/week average`,
      painPoints: `1. Manual data entry is tedious and error-prone
2. Email approval creates bottleneck and lacks visibility
3. No real-time status tracking for invoices
4. Month-end close requires overtime
5. Vendors frequently call to check payment status`,
      constraints: `Budget: $150K implementation + $50K annual
Timeline: Must complete before fiscal year end (6 months)
Technical: Must integrate with existing Oracle ERP
Change management: Finance team resistant to new tools`,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const EXCEL_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'excel-data-analyzer': {
    skillId: 'excel-data-analyzer',
    defaultTestCaseId: 'excel-analyzer-default-1',
    description: 'Analyzing sales data for quarterly trends',
    inputPayload: {
      dataDescription: `Sales Performance Dataset - Q1-Q3 2024 with daily records tracking revenue, units, and customer metrics across 4 regions and 3 product categories. Contains 15,000 rows from 50 sales reps. Software sales spiked in March due to new product launch. West region added 5 new reps in Q2.`,
      dataSample: `Date	Region	Product	Sales Rep	Deal Size	Revenue	Units	Customer Type	Cycle Days	Win Rate
2024-01-15	North	Software	John Smith	Large	75000	15	New	45	68%
2024-01-15	South	Hardware	Jane Doe	Medium	32000	8	Existing	22	82%
2024-01-16	East	Services	Bob Wilson	Small	8500	2	Renewal	12	91%
2024-01-16	West	Software	Alice Chen	Large	125000	25	New	62	71%
2024-01-17	North	Hardware	Tom Brown	Medium	28000	7	Existing	18	79%
2024-02-01	South	Software	Jane Doe	Large	95000	19	New	55	65%
2024-02-15	East	Services	Carol White	Small	6500	1	Renewal	8	88%
2024-03-01	West	Software	David Lee	Large	180000	35	New	72	74%
2024-03-15	North	Software	John Smith	Medium	42000	10	Existing	28	85%
2024-03-20	South	Hardware	Maria Garcia	Small	9200	3	New	15	77%`,
      analysisGoal: 'Identify Trends & Patterns',
      contextInfo: `Key context:
- Q1 target: $2.5M (achieved $2.8M)
- Q2 target: $3.0M (achieved $2.6M - missed due to supply chain)
- New product launch in March drove software spike
- Industry average win rate: 72%
- Average sales cycle for our category: 35 days`,
    },
  },

  'excel-chart-designer': {
    skillId: 'excel-chart-designer',
    defaultTestCaseId: 'excel-chart-default-1',
    description: 'Creating executive dashboard charts',
    inputPayload: {
      dataSample: `Month	SaaS Revenue	Services Revenue	Hardware Revenue	New Customers	Churned	NPS	Support Tickets	Avg Resolution (hrs)
Jan-24	450000	125000	85000	48	12	72	234	4.2
Feb-24	465000	118000	92000	52	8	74	218	3.8
Mar-24	510000	142000	78000	61	15	71	256	4.5
Apr-24	525000	135000	88000	55	10	75	241	3.9
May-24	548000	128000	95000	63	9	77	229	3.6
Jun-24	572000	155000	82000	71	14	73	267	4.1
Jul-24	595000	148000	91000	68	11	76	248	3.7
Aug-24	618000	162000	86000	74	13	78	232	3.5
Sep-24	645000	170000	94000	82	10	80	221	3.3`,
      messageToConvey: 'Demonstrate strong YoY revenue growth driven primarily by SaaS expansion, while highlighting improving customer satisfaction (NPS up 8 points) and operational efficiency (support resolution time down 20%). Flag concern about Services revenue volatility.',
      audienceType: 'Executive Presentation',
      toolVersion: 'Excel 365',
    },
  },

  'excel-marketing-dashboard': {
    skillId: 'excel-marketing-dashboard',
    defaultTestCaseId: 'excel-marketing-default-1',
    description: 'Building marketing campaign performance dashboard',
    inputPayload: {
      marketingData: `Channel	Month	Impressions	Clicks	Cost	Leads	MQLs	SQLs	Opps	Won	Revenue
Google Ads	Jan-24	2500000	45000	42000	890	312	156	78	23	184000
Google Ads	Feb-24	2750000	52000	45000	1050	368	184	92	31	248000
LinkedIn	Jan-24	850000	12500	35000	425	170	85	42	12	96000
LinkedIn	Feb-24	920000	14200	38000	510	204	102	51	18	144000
Facebook	Jan-24	3200000	28000	22000	320	112	45	18	5	40000
Facebook	Feb-24	3500000	32000	25000	380	133	53	21	7	56000
Email	Jan-24	125000	8500	3500	680	340	204	102	35	280000
Email	Feb-24	132000	9200	3800	750	375	225	112	42	336000
Content/SEO	Jan-24	450000	32000	18000	520	260	130	65	22	176000
Content/SEO	Feb-24	485000	35500	19000	580	290	145	72	26	208000`,
      channels: 'Google Ads, LinkedIn Ads, Facebook/Meta Ads, Email Marketing, Content/SEO (Organic)',
      reportingPeriod: 'Q1 2024 (January - March)',
      audienceLevel: 'CMO/Executive',
    },
  },

  'excel-data-cleaner': {
    skillId: 'excel-data-cleaner',
    defaultTestCaseId: 'excel-cleaner-default-1',
    description: 'Cleaning messy customer data export',
    inputPayload: {
      dataSample: `CustomerID	Name	Email	Phone	Address	City	State	Zip	SignupDate	Status
1001	JOHN SMITH	john.smith@gmail.com	555-123-4567	123 Main Street	New York	NY	10001	1/15/2024	Active
1002	jane doe	jane.doe@gmial.com	(555) 234-5678	456 Oak St.	Los Angeles	California	90210-1234	15-Jan-24	active
1003	Mr. Bob Wilson	bob.wilson@yahoo.com	5553456789	789 Pine Ave	Chicago	IL	60601	2024-01-20	A
1004	ALICE CHEN	alice.chen@yaho.com	+1-555-456-7890	321 Elm Street	San Francisco	CA	94102	January 22, 2024	1
1005	Smith, John	john.smith@gmail.com	555.123.4567	123 Main St	new york	ny	10001	01/15/2024	Yes
1006	Dr. Carol White		(555)567-8901	654 Maple Dr.	Boston	Massachusetts	02101	2024-02-01	Active
1007	david lee	david.lee@hotmail.com	555 678 9012	987 Cedar Blvd	Seattle	WA		Feb 5, 2024	ACTIVE
1008	MARIA GARCIA	maria.garcia@outlook.com		111 Birch Lane	Miami	FL	33101	2024-02-10	Inactive`,
      expectedFormat: `Required clean format:
- CustomerID: Integer, no changes needed
- Name: Split to FirstName, LastName columns, proper case, no titles
- Email: lowercase, must contain @ and valid domain
- Phone: Format as (XXX) XXX-XXXX
- Address: Standardize abbreviations (St., Ave., Dr., Blvd., Ln.)
- City: Proper case
- State: 2-letter abbreviation only
- Zip: 5-digit only (strip +4)
- SignupDate: Format as YYYY-MM-DD
- Status: Only "Active" or "Inactive"`,
      cleaningPriority: 'Full Audit',
      businessRules: `Validation rules:
- Duplicate detection: same email = duplicate (keep most recent)
- Phone required for Status=Active customers
- Email required for all customers
- State must be valid US state abbreviation
- Zip must be valid 5-digit format`,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AI SOLUTIONS ARCHITECT SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const AI_SOLUTIONS_ARCHITECT_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'ai-solutions-architect-ai-use-case-prioritization-framework': {
    skillId: 'ai-solutions-architect-ai-use-case-prioritization-framework',
    defaultTestCaseId: 'ai-use-case-prioritization-default-1',
    description: 'AI use case prioritization for financial services company',
    inputPayload: {
      industry: 'Financial Services / Banking',
      companySize: 'Large (1001-5000)',
      annualRevenue: '$2.5B',
      aiMaturityLevel: 'Developing (experiments)',
      strategicPriorities: `1. Reduce operational costs by 15% through automation
2. Improve fraud detection accuracy to >99%
3. Enhance customer experience with personalized services
4. Meet regulatory compliance requirements efficiently
5. Enable faster time-to-market for new products`,
      useCasesToEvaluate: `1. Fraud Detection Enhancement - Real-time ML-based transaction monitoring
2. Customer Churn Prediction - Identify at-risk customers for retention
3. Document Processing Automation - Extract data from loan applications
4. Personalized Product Recommendations - Next-best-offer engine
5. Credit Risk Scoring - ML-enhanced credit decisioning
6. Customer Service Chatbot - AI-powered customer support
7. Regulatory Compliance Monitoring - Automated compliance checking
8. AML Transaction Monitoring - Anti-money laundering detection`,
      budgetRange: '$1M - $5M',
      timelineConstraints: '12-18 months',
      technicalCapabilities: `- 5 data scientists, 3 ML engineers
- AWS cloud environment (partially AI-ready)
- Snowflake data warehouse
- Limited MLOps experience
- Strong data engineering team`,
      additionalContext: 'Recent regulatory pressure to improve fraud detection. CEO has prioritized AI as strategic initiative for next 2 years. Some legacy systems may require modernization.',
    },
  },

  'ai-solutions-architect-ai-data-readiness-audit': {
    skillId: 'ai-solutions-architect-ai-data-readiness-audit',
    defaultTestCaseId: 'ai-data-readiness-default-1',
    description: 'Data readiness audit for retail AI initiative',
    inputPayload: {
      companyName: 'RetailMax Corporation',
      industry: 'Retail / E-commerce',
      companySize: 'Large (1001-5000)',
      currentDataPlatform: `- Cloud: AWS (primary), some Azure legacy
- Data Warehouse: Snowflake
- Data Lake: S3 with some organization issues
- ETL: Mix of Airflow and legacy SSIS
- Analytics: Tableau, Looker`,
      plannedAIUseCases: `1. Demand Forecasting - predict inventory needs
2. Customer Segmentation - personalized marketing
3. Price Optimization - dynamic pricing engine
4. Recommendation Engine - product recommendations`,
      targetTimeline: '12-18 months',
      dataBudget: '$500K - $1M',
      primaryDataSources: `- Point of Sale: 500M transactions/year in Oracle
- E-commerce: Shopify data, 50M sessions/month
- Customer Data: CDP with 10M customer profiles
- Inventory: SAP inventory management
- Marketing: Google Analytics, Meta, TikTok pixels`,
      dataVolume: '50TB total, 500GB daily ingestion',
      dataTeamSize: '4 data engineers, 2 analysts, 1 data architect',
      knownDataChallenges: 'Customer ID resolution across channels is inconsistent. Historical data quality issues in legacy systems. Real-time data access limited.',
      complianceRequirements: 'CCPA (California customers), GDPR (EU operations), PCI-DSS (payment data)',
      additionalContext: 'Recently completed data warehouse migration to Snowflake. Data governance program started 6 months ago.',
    },
  },

  'ai-solutions-architect-ai-risk-assessment-mitigation-plan': {
    skillId: 'ai-solutions-architect-ai-risk-assessment-mitigation-plan',
    defaultTestCaseId: 'ai-risk-assessment-default-1',
    description: 'Risk assessment for AI-powered lending decision system',
    inputPayload: {
      companyName: 'QuickLend Financial',
      industry: 'Financial Services / Lending',
      companySize: 'Medium (201-1000)',
      riskAppetite: 'Conservative',
      aiUseCase: `AI-powered credit decisioning system that will:
- Score loan applications using ML models
- Recommend loan terms and pricing
- Flag applications for human review
- Automate decisions for low-risk applications
Processing 50,000 applications/month, average loan size $15,000`,
      technologyStack: `- Cloud: AWS
- ML Platform: SageMaker
- Models: XGBoost, Neural Network ensemble
- Data: Snowflake, bureau data feeds
- Integration: REST APIs to loan origination system`,
      dataSources: `- Customer application data (income, employment, etc.)
- Credit bureau data (Equifax, TransUnion, Experian)
- Bank statement analysis
- Employment verification
- Property valuations (for secured loans)`,
      targetUsers: 'Loan applicants (external), underwriters (internal), compliance team',
      decisionImpact: 'Automated approval/denial of loans up to $25,000. Affects customer credit access and company risk exposure.',
      existingControls: 'Manual underwriting process, basic scoring models, compliance review for large loans',
      applicableRegulations: 'ECOA (Equal Credit Opportunity Act), FCRA (Fair Credit Reporting Act), State lending laws, CFPB guidance on AI in lending',
      stakeholderConcerns: 'Fair lending compliance, model explainability for denials, bias in historical training data, regulatory examination risk',
      additionalContext: 'Regulators have increased scrutiny of AI in lending. Recent consent orders in industry for discriminatory lending practices.',
    },
  },

  'ai-solutions-architect-ai-integration-architecture-blueprint': {
    skillId: 'ai-solutions-architect-ai-integration-architecture-blueprint',
    defaultTestCaseId: 'ai-architecture-default-1',
    description: 'Architecture blueprint for real-time recommendation engine',
    inputPayload: {
      companyName: 'StreamFlix Media',
      industry: 'Media / Entertainment',
      companySize: 'Large (1001-5000)',
      currentTechStack: `- Cloud: GCP (primary)
- Backend: Go microservices, gRPC
- Databases: PostgreSQL, Redis, BigQuery
- Streaming: Kafka
- Frontend: React, React Native
- CDN: Cloudflare`,
      useCaseDescription: `Build a real-time content recommendation engine that:
- Personalizes content recommendations for 10M+ users
- Updates recommendations based on real-time viewing behavior
- Supports multiple content types (movies, series, live events)
- Enables A/B testing of recommendation algorithms
- Provides explainable recommendations ("Because you watched...")`,
      predictionsPerDay: '500M+ recommendation requests',
      latencyRequirement: 'Real-time (<100ms)',
      availabilityRequirement: '99.99% (52.6 min)',
      sourceSystems: `- User viewing history (BigQuery)
- Content metadata catalog (PostgreSQL)
- Real-time viewing events (Kafka)
- User preferences (Redis)
- Social signals (external API)`,
      targetSystems: `- Web application
- Mobile apps (iOS, Android)
- Smart TV apps
- Email marketing system
- Push notification service`,
      cloudProvider: 'GCP',
      budgetRange: '$500K - $1M',
      complianceRequirements: 'GDPR (EU users), COPPA (children\'s content), CCPA',
      teamCapabilities: '3 ML engineers, 5 backend engineers, strong DevOps team, limited feature store experience',
    },
  },

  'ai-solutions-architect-ai-cost-benefit-analysis-calculator': {
    skillId: 'ai-solutions-architect-ai-cost-benefit-analysis-calculator',
    defaultTestCaseId: 'ai-cost-benefit-default-1',
    description: 'Cost-benefit analysis for customer service AI automation',
    inputPayload: {
      companyName: 'TelcoGlobal Communications',
      industry: 'Telecommunications',
      annualRevenue: '$5B',
      discountRate: '12%',
      aiUseCase: `Deploy AI-powered customer service automation:
- Conversational AI chatbot for tier-1 support
- Agent assist AI for complex issues
- Automated ticket routing and prioritization
- Sentiment analysis and escalation detection
- Knowledge base auto-generation from resolved tickets`,
      projectScope: '3 contact centers, 2,000 agents, 15M customer interactions/year',
      expectedDuration: '18-24 months',
      initialInvestment: '$3.5M (platform, integration, training)',
      ongoingCosts: `- Cloud infrastructure: $50K/month
- AI platform licenses: $200K/year
- 2 FTE ML engineers: $400K/year
- Support and maintenance: $150K/year`,
      teamSize: '2 ML engineers, 1 PM, support from IT (3 FTE equivalent)',
      revenueImpact: 'Expect 5% reduction in churn due to improved experience = $25M revenue retention over 3 years',
      costSavings: `- 30% reduction in average handle time
- 40% of tier-1 inquiries fully automated
- 500 FTE equivalent reduction (through attrition, not layoffs)
- $15M/year labor savings at full deployment`,
      strategicBenefits: '24/7 support capability, faster response times, improved CSAT, competitive differentiation',
      riskFactors: 'Technology adoption by agents, customer acceptance of AI, integration complexity with legacy systems',
      additionalContext: 'Union agreement requires no layoffs - savings through attrition and redeployment. Competitor launched similar system last year.',
    },
  },

  'ai-solutions-architect-ai-change-management-playbook': {
    skillId: 'ai-solutions-architect-ai-change-management-playbook',
    defaultTestCaseId: 'ai-change-management-default-1',
    description: 'Change management for AI-powered sales enablement platform',
    inputPayload: {
      companyName: 'Enterprise Software Inc.',
      industry: 'Technology / B2B SaaS',
      employeeCount: '2,500',
      geographicSpread: 'Multiple countries',
      organizationalCulture: 'Modern/Collaborative',
      aiUseCase: `Deploying AI-powered sales enablement platform:
- AI-generated personalized outreach emails
- Meeting intelligence (transcription, action items)
- Opportunity scoring and next-best-action
- Competitive intelligence alerts
- Automated CRM data entry`,
      departmentsAffected: 'Sales (500 reps), Sales Operations (25), Marketing (100), Customer Success (150)',
      rolesImpacted: 'Account Executives, SDRs, Sales Managers, Sales Engineers, Marketing Ops',
      estimatedUsers: '775 direct users',
      previousChangeInitiatives: 'CRM migration 2 years ago - mixed results, 60% adoption after 1 year. Sales methodology change - successful with executive sponsorship.',
      knownConcerns: `- Sales reps worry AI will replace them or monitor performance
- Managers concerned about data quality from AI transcription
- Some resistance to changing established workflows
- Privacy concerns about meeting recording`,
      executiveSponsor: 'Chief Revenue Officer',
      goLiveDate: 'Q2 2025 (4 months)',
      additionalContext: 'Sales team exceeded quota last year and may resist changes. High-performing reps especially skeptical. Need quick wins to build momentum.',
    },
  },

  'ai-solutions-architect-ai-pilot-program-designer': {
    skillId: 'ai-solutions-architect-ai-pilot-program-designer',
    defaultTestCaseId: 'ai-pilot-program-default-1',
    description: 'Pilot program design for AI-powered quality inspection',
    inputPayload: {
      companyName: 'PrecisionMFG Industries',
      industry: 'Manufacturing',
      companySize: 'Large (1001-5000)',
      aiMaturityLevel: 'Initial (no AI)',
      aiUseCase: `Computer vision AI for automated quality inspection:
- Visual defect detection on production line
- Real-time alerts for quality issues
- Defect classification and root cause analysis
- Quality metrics dashboard
- Integration with MES system`,
      businessObjectives: `- Reduce defect escape rate from 2% to 0.5%
- Decrease manual inspection time by 50%
- Improve first-pass yield by 5%
- Enable 100% inspection (vs. current sampling)`,
      technicalApproach: 'Edge AI cameras with cloud training. Pre-trained models fine-tuned on our defect types. Real-time inference at production speed (100 parts/minute).',
      targetUsers: 'Quality inspectors (20), Production supervisors (8), Quality Manager',
      geographicScope: 'Single location',
      pilotDuration: '12 weeks',
      baselineMetrics: `- Current defect escape rate: 2.1%
- Manual inspection time: 30 seconds/part
- First-pass yield: 94%
- Customer returns (quality): 150/month`,
      pilotBudget: '$150K',
      constraints: `- Cannot disrupt production line
- Union rules on job changes
- Limited IT support at plant
- Network bandwidth constraints
- Clean room requirements for cameras`,
      additionalContext: 'First AI project for the company. Success here will unlock budget for other use cases. Plant manager is champion but workers are skeptical.',
    },
  },

  'ai-solutions-architect-ai-performance-monitoring-dashboard-spec': {
    skillId: 'ai-solutions-architect-ai-performance-monitoring-dashboard-spec',
    defaultTestCaseId: 'ai-monitoring-dashboard-default-1',
    description: 'Monitoring dashboard for production ML models in insurance',
    inputPayload: {
      companyName: 'SecureLife Insurance',
      industry: 'Insurance',
      companySize: 'Large (1001-5000)',
      currentMonitoringTools: 'Datadog for infrastructure, Splunk for logs, custom Python dashboards for some metrics',
      aiUseCase: `Production ML models in use:
- Claims fraud detection (500K predictions/month)
- Underwriting risk scoring (100K quotes/month)
- Customer churn prediction (weekly batch)
- Document classification (1M documents/month)`,
      modelTypes: 'XGBoost, Random Forest, Neural Networks, NLP transformers',
      predictionVolume: '50K+ predictions per day across all models',
      deploymentArchitecture: 'SageMaker endpoints, Lambda for some batch jobs, Step Functions orchestration',
      dashboardUsers: 'Data Science team (10), MLOps (3), Business stakeholders (5), Executive sponsors (2)',
      slaRequirements: `- Model availability: 99.9%
- Inference latency: <200ms for real-time
- Model accuracy: maintain within 5% of baseline
- Data freshness: features updated within 4 hours`,
      cloudPlatform: 'AWS',
      alertRequirements: 'PagerDuty for critical (P1), Slack for high (P2), email for medium/low. Follow-the-sun on-call rotation.',
      complianceNeeds: 'Model performance documentation for regulatory exams. Audit trail for predictions. Fairness monitoring for underwriting.',
      additionalContext: 'Regulators have asked about model governance. Need to demonstrate we monitor and can explain model decisions.',
    },
  },

  'ai-solutions-architect-ai-security-privacy-compliance-checker': {
    skillId: 'ai-solutions-architect-ai-security-privacy-compliance-checker',
    defaultTestCaseId: 'ai-security-compliance-default-1',
    description: 'Security and compliance assessment for AI chatbot with PII',
    inputPayload: {
      companyName: 'GlobalBank Financial',
      industry: 'Financial Services / Banking',
      companySize: 'Enterprise (5000+)',
      geographicPresence: 'US, EU, UK, Canada, Singapore',
      aiUseCase: `Customer-facing AI chatbot:
- Handles account inquiries and transactions
- Processes customer PII (name, account numbers, SSN)
- Integrates with core banking system
- Uses LLM for natural language understanding
- 24/7 availability for 5M customers`,
      dataTypes: `- Customer PII (name, address, SSN, DOB)
- Account information (balances, transactions)
- Authentication tokens
- Conversation logs (may contain PII)
- Voice recordings (if voice enabled)`,
      modelArchitecture: `- LLM: Azure OpenAI GPT-4
- Custom fine-tuned intent classifier
- Entity extraction model
- Sentiment analysis
- Deployed on Azure with private endpoints`,
      deploymentModel: 'Cloud-hosted',
      existingSecurityControls: 'WAF, DDoS protection, MFA, data encryption (AES-256), VPN access, SOC monitoring, quarterly pen tests',
      applicableRegulations: 'GLBA, SOX, FFIEC guidance, GDPR (EU), UK FCA, MAS (Singapore), CCPA, PCI-DSS (if payment processing)',
      currentComplianceStatus: 'SOC 2 Type II, PCI-DSS Level 1, ISO 27001 certified',
      dataSources: 'Core banking (Temenos), CRM (Salesforce), knowledge base (SharePoint), customer authentication (Okta)',
      dataFlows: 'Customer → Azure WAF → Azure OpenAI → Custom models → Core banking APIs → Response',
      additionalContext: 'Board and regulators are closely watching AI deployments in banking. Recent industry incidents have increased scrutiny.',
    },
  },

  'ai-solutions-architect-ai-stakeholder-communication-package': {
    skillId: 'ai-solutions-architect-ai-stakeholder-communication-package',
    defaultTestCaseId: 'ai-stakeholder-comms-default-1',
    description: 'Communication package for enterprise AI transformation',
    inputPayload: {
      companyName: 'Industrial Dynamics Corp',
      industry: 'Manufacturing / Industrial',
      employeeCount: '8,000',
      brandVoice: 'Professional/Formal',
      initiativeName: 'Smart Factory AI Initiative',
      aiUseCase: `Company-wide AI transformation including:
- Predictive maintenance for equipment
- Quality inspection automation
- Demand forecasting
- Supply chain optimization
- Safety incident prediction`,
      businessImpact: `- $50M cost savings over 3 years
- 30% reduction in unplanned downtime
- 25% improvement in forecast accuracy
- 15% reduction in safety incidents
- 5% improvement in OEE`,
      timeline: '24+ months',
      keyAudiences: 'Board of Directors, Executive Leadership, Plant Managers (15), Union Leadership, All Employees (8,000), Customers (for quality improvements), Investors',
      knownConcerns: `- Union concerns about job displacement
- Skepticism from long-tenured employees
- Safety team concerns about AI making safety decisions
- Board wants clear ROI timeline
- Some managers resistant to data-driven decisions`,
      primaryGoals: `- Build excitement about AI opportunities
- Address job security concerns directly
- Demonstrate commitment to workforce development
- Show clear business value
- Establish trust in AI governance`,
      sensitiveTopics: 'Workforce implications, safety-critical decisions, data collection from workers, performance monitoring',
      legalRequirements: 'Union consultation requirements, works council approval (EU plants), SEC disclosure considerations',
      additionalContext: 'CEO committed publicly to no AI-related layoffs. Need to balance transformation messaging with workforce sensitivity. Union contract renewal in 18 months.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNANCE SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const GOVERNANCE_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'ai-governance-readiness-assessment': {
    skillId: 'ai-governance-readiness-assessment',
    defaultTestCaseId: 'ai-gov-readiness-default-1',
    description: 'Assessing AI governance readiness for mid-size tech company',
    inputPayload: {
      organizationSize: '501-2000 employees',
      industry: 'Technology / SaaS',
      currentAIUsage: 'ChatGPT Enterprise for customer support, GitHub Copilot for engineering team, Jasper for marketing content, internal ML models for fraud detection. Some employees using personal AI accounts for work tasks.',
      dataClassifications: 'Public marketing content, Internal business documents, Confidential customer data (PII), Restricted financial data and trade secrets. We process healthcare data for some enterprise clients (HIPAA relevant).',
      existingPolicies: 'IT Security Policy (updated 2023), Acceptable Use Policy, Data Privacy Policy, Employee Handbook with confidentiality section. No AI-specific policies yet.',
      keyConcerns: 'Data leakage through AI prompts, employees sharing confidential info with AI tools, compliance with SOC2 and GDPR, intellectual property protection, vendor lock-in with AI providers.',
      regulatoryRequirements: 'SOC2 Type II (current), GDPR (EU customers), working toward HIPAA certification for healthcare vertical.',
    },
  },

  'secure-ai-usage-playbook': {
    skillId: 'secure-ai-usage-playbook',
    defaultTestCaseId: 'secure-ai-playbook-default-1',
    description: 'Creating AI usage playbook for enterprise organization',
    inputPayload: {
      approvedAITools: 'ChatGPT Enterprise (primary), GitHub Copilot (engineering only), Grammarly Business, Claude (via API for internal tools), Midjourney (marketing with approval).',
      commonUseCases: 'Customer support response drafting, code generation and review, marketing copy creation, document summarization, email drafting, data analysis assistance, meeting notes generation.',
      prohibitedActivities: 'Sharing customer PII, uploading source code to non-approved tools, using AI for employment decisions, generating legal advice, processing payment card data.',
      dataHandlingRules: 'Never input: customer names with account details, SSNs/government IDs, passwords/API keys, proprietary algorithms, unreleased product details. Always allowed: public documentation, anonymized data, general questions.',
      regulatoryContext: 'SOC2 Type II certified, GDPR compliant, processing healthcare data (HIPAA). Financial services clients require additional data protection.',
      audienceLevel: 'All Employees',
    },
  },

  'ai-data-flow-risk-map': {
    skillId: 'ai-data-flow-risk-map',
    defaultTestCaseId: 'ai-data-flow-default-1',
    description: 'Mapping AI data flows for SaaS platform',
    inputPayload: {
      keySystemsInventory: 'Salesforce CRM, Snowflake Data Warehouse, PostgreSQL (production), AWS S3 (file storage), Zendesk (support), HubSpot (marketing), Workday (HR), NetSuite (finance), GitHub (code), Confluence (docs).',
      dataTypesProcessed: 'Customer PII (name, email, phone, address), Financial data (invoices, payments), Employee HR data, Product usage analytics, Support tickets with customer details, Marketing engagement data.',
      aiIntegrations: 'ChatGPT Enterprise connected to Zendesk for support drafts, Copilot for code, Internal LLM for data analysis queries against Snowflake, Marketing AI for content generation.',
      dataResidencyRequirements: 'EU customer data must stay in EU (Frankfurt AWS region). US healthcare data requires HIPAA-compliant storage. Some government contracts require US-only processing.',
      currentSecurityControls: 'SSO with Okta, MFA required, DLP on email, encryption at rest and transit, VPN for production access, quarterly access reviews.',
      plannedAIExpansions: 'AI-powered customer success predictions, automated document processing, AI chatbot for customer self-service, code review automation.',
    },
  },

  'ai-governance-client-brief': {
    skillId: 'ai-governance-client-brief',
    defaultTestCaseId: 'ai-gov-client-brief-default-1',
    description: 'Creating client brief for AI governance consulting engagement',
    inputPayload: {
      clientIndustry: 'Financial Services / Insurance',
      clientRiskPosture: 'Conservative - highly regulated industry with strict compliance requirements',
      mainObjections: 'Concerns about AI hallucinations affecting customer advice, regulatory uncertainty around AI in financial decisions, data privacy with third-party AI vendors, explainability requirements for underwriting decisions.',
      yourAICapabilities: 'Enterprise AI governance framework, AI risk assessment methodology, policy development, training programs, compliance monitoring tools, incident response for AI issues.',
      dataHandlingPractices: 'All data encrypted, SOC2 Type II certified, GDPR compliant, no data used for AI model training, EU data center options available, data deletion upon contract end.',
      complianceCertifications: 'SOC2 Type II, ISO 27001, GDPR Article 28 compliant processor, CCPA compliant, pending FedRAMP authorization.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// OPERATIONS SKILLS - DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const OPERATIONS_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'compliance-audit-prep-assistant': {
    skillId: 'compliance-audit-prep-assistant',
    defaultTestCaseId: 'compliance-audit-prep-default-1',
    description: 'Preparing for SOC2 Type II audit',
    inputPayload: {
      auditType: 'SOC2 Type II',
      auditScope: 'All production systems hosting customer data, security controls, availability monitoring, change management processes, incident response, vendor management.',
      auditTimeline: 'Audit fieldwork begins in 8 weeks. Final report needed by end of Q1 for customer contracts.',
      controlFramework: 'Trust Services Criteria - Security, Availability, Confidentiality. 89 controls total.',
      availableEvidence: 'Access logs from Okta and AWS, change management tickets in Jira, incident reports in PagerDuty, security training completion in LMS, vulnerability scans from Qualys.',
      knownGaps: 'Vendor risk assessment process not fully documented, some access reviews overdue, incident response policy needs update, DR testing not completed this year.',
      previousFindings: 'Last year: 2 findings - incomplete access reviews, missing encryption on one backup system. Both remediated.',
    },
  },

  'policy-document-generator': {
    skillId: 'policy-document-generator',
    defaultTestCaseId: 'policy-doc-default-1',
    description: 'Generating incident response policy document',
    inputPayload: {
      policyType: 'Incident Response Policy',
      organizationContext: 'B2B SaaS company, 200 employees, processing customer business data. 24/7 operations with on-call engineering rotation.',
      regulatoryRequirements: 'SOC2 Type II (Security & Availability), GDPR (72-hour breach notification), some customers require specific incident SLAs.',
      existingPractices: 'PagerDuty for alerting, Slack war rooms for incidents, Jira for tracking, monthly incident reviews. No formal documented policy.',
      approvalAuthority: 'CISO for policy approval, VP Engineering for process changes, Legal for breach notifications.',
      reviewCycle: 'Annual review required, or after major incidents.',
      audienceScope: 'All engineering and operations staff, security team, customer success for communication.',
    },
  },

  'incident-postmortem-generator': {
    skillId: 'incident-postmortem-generator',
    defaultTestCaseId: 'incident-postmortem-default-1',
    description: 'Generating postmortem for database outage',
    inputPayload: {
      incidentTitle: 'Primary Database Failover Failure',
      severity: 'SEV1 - Critical (major outage, data loss)',
      incidentTimeline: `09:15 UTC - Primary DB CPU spike detected
09:18 UTC - Automated failover triggered
09:19 UTC - Failover failed - replica 3 hours behind
09:22 UTC - On-call DBA paged
09:30 UTC - Identified replication lag issue
09:45 UTC - Manual failover to secondary replica initiated
10:05 UTC - Service restored with 2 hours data rollback
10:30 UTC - Full data recovery from backup completed
11:00 UTC - Incident resolved, monitoring confirmed`,
      impactDescription: '50 minutes of service degradation, 35 minutes complete outage. Approximately 2 hours of transaction data required recovery from backup. 200+ customers affected. 3 customers reported data discrepancies.',
      rootCauseAnalysis: 'Replication lag accumulated due to large batch job running during peak hours. Monitoring alert threshold set too high (30 min lag vs actual 3 hours). Automated failover checked replication status but threshold was misconfigured.',
      responseActions: 'Manual failover to healthy replica, point-in-time recovery from backup, customer communication via status page and direct outreach to affected accounts.',
      contributingFactors: 'Batch job scheduled during business hours, replication monitoring threshold too permissive, failover automation did not validate data currency.',
      lessonsLearned: 'Need better monitoring for replication lag, batch jobs should run off-peak, failover automation needs stricter data validation.',
    },
  },

  'change-request-doc-builder': {
    skillId: 'change-request-doc-builder',
    defaultTestCaseId: 'change-request-default-1',
    description: 'Building change request for infrastructure upgrade',
    inputPayload: {
      changeSummary: 'Upgrade Kubernetes cluster from v1.27 to v1.29 across all production environments to address security vulnerabilities and enable new features.',
      changeType: 'Standard Change (Pre-Approved)',
      systemsAffected: 'Production Kubernetes clusters (3), staging cluster, all deployed microservices (45), monitoring and logging infrastructure, CI/CD pipelines.',
      implementationSteps: '1. Update staging cluster and validate\n2. Run full test suite on staging\n3. Update prod-east cluster (canary)\n4. Monitor for 2 hours\n5. Update prod-west cluster\n6. Update prod-eu cluster\n7. Update CI/CD configurations\n8. Validate monitoring and alerting',
      testingEvidence: 'Staging upgrade completed successfully. All 847 integration tests passing. Load test showed no performance regression. Security scan clean.',
      rollbackPlan: 'Kubernetes supports in-place downgrade. If issues occur: 1) Cordon affected nodes, 2) Drain workloads, 3) Downgrade node version, 4) Uncordon and verify. Estimated rollback time: 30 minutes per cluster.',
      scheduledWindow: 'Saturday 2:00 AM - 8:00 AM PST (low traffic window)',
      riskAssessment: 'Medium risk - proven upgrade path, but involves all production infrastructure. Mitigation: rolling upgrade with validation gates between clusters.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const WORKFLOW_DEFAULT_TEST_DATA: Record<string, WorkflowDefaultTestData> = {
  'job-application': {
    workflowId: 'job-application',
    defaultTestCaseId: 'job-app-workflow-default-1',
    description: 'Complete job application package for Senior Software Engineer',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      resume: SAMPLE_RESUME,
      additionalContext: 'I am particularly excited about this role because of their focus on developer experience and platform engineering.',
    },
  },

  'interview-prep': {
    workflowId: 'interview-prep',
    defaultTestCaseId: 'interview-workflow-default-1',
    description: 'Complete interview preparation for tech company',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      resume: SAMPLE_RESUME,
      additionalContext: 'Interview is in 3 days. Will have system design round and behavioral round.',
    },
  },

  'post-interview': {
    workflowId: 'post-interview',
    defaultTestCaseId: 'post-interview-workflow-default-1',
    description: 'Post-interview follow-up package',
    inputPayload: {
      jobTitle: 'Senior Software Engineer',
      companyName: 'TechForward Inc',
      interviewerName: 'Sarah Chen',
      interviewerRole: 'Engineering Manager',
      interviewHighlights: 'Discussed system design for event-driven architecture. Sarah seemed impressed with my CQRS proposal. Also talked about team culture and growth opportunities.',
      resume: SAMPLE_RESUME,
    },
  },

  'ai-governance-implementation': {
    workflowId: 'ai-governance-implementation',
    defaultTestCaseId: 'ai-gov-workflow-default-1',
    description: 'Complete AI governance program implementation',
    inputPayload: {
      organizationSize: '501-2000 employees',
      industry: 'Technology',
      currentAIUsage: 'ChatGPT Enterprise for support, GitHub Copilot for engineering, exploring AI analytics. Some shadow IT with personal AI accounts.',
      dataClassifications: 'Public, Internal, Confidential, Restricted. Customer PII and some enterprise client financial data.',
      keyConcerns: 'Data leakage through AI prompts, compliance with SOC2 and GDPR, IP protection, inconsistent usage policies.',
      approvedAITools: 'ChatGPT Enterprise, GitHub Copilot, Grammarly',
      regulatoryRequirements: 'SOC2 Type II, GDPR, working toward HIPAA',
      existingPolicies: 'IT Security Policy, Acceptable Use Policy, Data Privacy Policy (no AI-specific)',
    },
  },

  'compliance-program-builder': {
    workflowId: 'compliance-program-builder',
    defaultTestCaseId: 'compliance-workflow-default-1',
    description: 'SOC2 Type II audit preparation and policy generation',
    inputPayload: {
      auditType: 'SOC2 Type II',
      auditScope: 'All production systems, customer data handling, security controls for SaaS platform',
      auditTimeline: 'Audit fieldwork begins in 10 weeks',
      controlFramework: 'Trust Services Criteria: Security, Availability, Confidentiality',
      availableEvidence: 'We have access logs, change management records, incident reports, security training completion. Missing: formal policies for several areas.',
      organizationContext: 'B2B SaaS company, 150 employees, handling customer business data including some financial information',
      knownGaps: 'Missing formal incident response policy, vendor management policy needs update, access review process not documented',
      previousFindings: 'First SOC2 audit',
      policyNeeded: 'Incident Response Policy',
    },
  },

  'incident-to-improvement': {
    workflowId: 'incident-to-improvement',
    defaultTestCaseId: 'incident-workflow-default-1',
    description: 'Production incident postmortem and remediation change request',
    inputPayload: {
      incidentTitle: 'API Gateway Outage - Payment Processing',
      severity: 'SEV1 - Critical (major outage, data loss)',
      incidentTimeline: `14:32 UTC - Monitoring alert: API gateway error rate >50%
14:35 UTC - On-call engineer paged
14:38 UTC - Initial investigation, identified memory leak in gateway
14:45 UTC - Attempted restart of affected pods
14:50 UTC - Restart failed, OOM killer triggering
15:05 UTC - Rolled back to previous gateway version
15:15 UTC - Services recovering
15:30 UTC - Full service restoration confirmed
15:45 UTC - Incident declared resolved`,
      impactDescription: 'Payment processing unavailable for 58 minutes during peak hours. Estimated 2,500 failed transactions, $125,000 revenue at risk. 50+ customer complaints received.',
      rootCauseAnalysis: 'Memory leak introduced in gateway v2.4.0 release. The leak occurred during request retry logic when downstream services were slow. Under normal load, leak was gradual. High traffic caused rapid memory exhaustion.',
      responseActions: 'Rolled back to gateway v2.3.5. Increased memory limits as temporary measure. Disabled retry logic for non-critical paths.',
      contributingFactors: 'Load testing did not simulate sustained high traffic. Memory monitoring alert threshold was too high (90% vs recommended 80%).',
      lessonsLearned: 'Need better load testing for edge cases. Need lower memory alert thresholds. Need runbook for gateway issues.',
      proposedRemediation: 'Fix memory leak in retry logic, add memory usage unit tests, lower monitoring threshold to 75%, create gateway troubleshooting runbook.',
      scheduledWindow: 'Next maintenance window - Saturday 2:00 AM PST',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING & WORKSHOP WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  'training-workshop': {
    workflowId: 'training-workshop',
    defaultTestCaseId: 'training-workshop-default-1',
    description: 'Complete training workshop setup for AI productivity tools',
    inputPayload: {
      workshopTopic: 'AI Tools for Business Productivity: ChatGPT, Claude, and Copilot',
      targetAudience: 'Marketing and sales professionals with 3-5 years experience. Basic familiarity with AI assistants but limited hands-on usage. Looking to improve daily efficiency and content creation speed.',
      duration: 'Half-day (4 hours)',
      deliveryFormat: 'Hybrid',
      learningObjectives: '1. Craft effective prompts for business writing tasks\n2. Use AI tools to create marketing content 3x faster\n3. Implement quality checks for AI-generated content\n4. Build personal AI workflows for common tasks\n5. Understand data privacy best practices when using AI',
      organizationContext: 'Mid-size B2B software company. Recently deployed ChatGPT Enterprise. Need to drive adoption and ensure proper usage.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEO & MARKETING WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  'seo-client-onboarding': {
    workflowId: 'seo-client-onboarding',
    defaultTestCaseId: 'seo-onboarding-default-1',
    description: 'SEO client onboarding for e-commerce platform',
    inputPayload: {
      websiteUrl: 'https://urbanpetco.com',
      businessDescription: 'Premium pet supplies and organic pet food e-commerce store. Focus on eco-friendly, sustainable products for dogs and cats. Direct-to-consumer model with subscription options for recurring purchases.',
      targetAudience: 'Millennial and Gen-Z pet owners (25-40), urban/suburban, household income $75K+. Value sustainability and pet health. Research-heavy purchase behavior, active on Instagram and TikTok.',
      competitors: 'Chewy.com (market leader), Petco.com, BarkBox, The Farmer\'s Dog, Wild One. Key differentiator: sustainability focus and curated premium selection.',
      businessGoals: 'Increase organic traffic 100% in 12 months. Rank top 3 for "organic dog food", "sustainable pet products", "eco-friendly cat supplies". Build content hub for pet wellness.',
      currentPerformance: 'Domain Authority: 28. Monthly organic traffic: ~15,000 visits. Currently ranking page 2-3 for main keywords. Site speed needs improvement (LCP 4.2s).',
    },
  },

  'marketing-campaign': {
    workflowId: 'marketing-campaign',
    defaultTestCaseId: 'marketing-campaign-default-1',
    description: 'Product launch marketing campaign for SaaS tool',
    inputPayload: {
      productService: 'TeamSync AI - An AI-powered project management tool that automatically generates project updates, identifies blockers, and suggests task prioritization. Integrates with Slack, Jira, and Asana. $29/user/month.',
      targetAudience: 'Project managers and team leads at tech companies (50-500 employees). Pain points: too many status meetings, manual reporting, unclear priorities. Active on LinkedIn, read productivity blogs.',
      campaignGoal: 'Product Launch',
      budget: '$5,000-$15,000',
      brandVoice: 'Professional & Authoritative',
      competitors: 'Monday.com, Asana, ClickUp, Linear. Our differentiation: AI-native, reduces meeting time by 50%, automatic stakeholder updates.',
      existingAssets: 'Product demo video, 3 customer testimonials, landing page (needs refresh), email list of 2,500 from beta waitlist.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTING & PROFESSIONAL SERVICES WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  'consulting-engagement': {
    workflowId: 'consulting-engagement',
    defaultTestCaseId: 'consulting-engagement-default-1',
    description: 'Consulting engagement for digital transformation initiative',
    inputPayload: {
      clientName: 'Midwest Regional Healthcare System',
      clientBackground: 'Network of 12 hospitals and 45 clinics across 3 states. 15,000 employees, $2.8B annual revenue. Currently using mix of legacy and modern systems. Recent merger added 3 hospitals with different tech stacks.',
      problemStatement: 'Patient experience fragmented across facilities. Scheduling, records, and billing systems not integrated. Digital engagement (portal, mobile app) lagging competitors. Need unified patient experience strategy and implementation roadmap.',
      currentState: 'Epic EHR at 9 hospitals, Cerner at 3. Multiple scheduling systems. Patient portal adoption at 23%. Mobile app outdated. Average patient satisfaction score: 3.2/5. IT department understaffed.',
      desiredOutcome: 'Unified patient experience across all facilities. Single patient portal with 60%+ adoption. Modern mobile app. Integrated scheduling. Patient satisfaction 4.2+/5 within 2 years.',
      constraints: 'Budget: $15M over 3 years. Cannot disrupt clinical operations. Union considerations for staff changes. Must maintain HIPAA compliance throughout.',
      stakeholders: 'CEO (sponsor), CIO, CMO, VP of Patient Experience, IT Director, Chief Nursing Officer, CFO (budget approval).',
    },
  },

  'startup-investor-pitch': {
    workflowId: 'startup-investor-pitch',
    defaultTestCaseId: 'startup-pitch-default-1',
    description: 'Seed round pitch preparation for fintech startup',
    inputPayload: {
      companyName: 'PayrollPilot',
      businessDescription: 'AI-powered payroll automation for SMBs. Our platform eliminates 95% of manual payroll tasks, automatically handles compliance across all 50 states, and integrates with existing accounting software. One-click payroll processing.',
      targetMarket: 'TAM: $12B US payroll software market. SAM: $4B SMB segment (10-200 employees). SOM: $400M (tech-forward SMBs). Target customer: Growing companies frustrated with ADP/Paychex complexity and cost.',
      businessModel: 'SaaS subscription: $6/employee/month (vs. $8-15 industry average). Average contract: $200-500/month. Current MRR: $45K. Net revenue retention: 115%.',
      traction: '180 paying customers, growing 18% MoM. $45K MRR. Zero churn last 3 months. 4.9/5 G2 rating. Partnership signed with QuickBooks. Featured in TechCrunch.',
      competitors: 'Gusto (main), Rippling, Justworks, ADP, Paychex. Our edge: True AI automation (not just software), 50% cheaper, 5-minute setup vs. 2-week onboarding.',
      fundingAsk: 'Raising $3M seed round. Use of funds: 50% engineering (AI accuracy improvements), 30% sales/marketing, 20% operations. 18-month runway to Series A metrics.',
      teamBackground: 'CEO: 10 years at ADP, led $50M product line. CTO: Ex-Google, ML/AI specialist, 15 patents. COO: Former Gusto ops lead. Team of 8, all payroll or ML experience.',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SALES & REVENUE WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  'sales-account-pursuit': {
    workflowId: 'sales-account-pursuit',
    defaultTestCaseId: 'sales-pursuit-default-1',
    description: 'Strategic account pursuit for enterprise software deal',
    inputPayload: {
      targetCompany: 'GlobalTech Manufacturing Inc.',
      companyContext: 'Fortune 500 manufacturer, $8B revenue, 25,000 employees globally. Digital transformation initiative announced in last earnings call. New CIO hired 6 months ago from AWS. Currently using SAP for ERP, Salesforce for CRM.',
      yourProduct: 'CloudOps Platform - Enterprise cloud management and optimization. Reduces cloud spend 30%, automates infrastructure provisioning, provides unified visibility across AWS/Azure/GCP. Typical deal size $200K-$1M ARR.',
      identifiedNeed: 'Overheard at conference they\'re struggling with multi-cloud complexity after Azure acquisition. Cloud costs up 40% YoY. Infrastructure team overwhelmed. Looking to modernize manufacturing operations.',
      stakeholders: 'CIO (Sarah Chen) - decision maker, likely champion. VP Infrastructure (Tom Williams) - technical evaluator. CFO (Robert Kim) - budget authority. Manufacturing VP - business case driver.',
      dealSize: '$500K-$1M',
      salesStage: 'Discovery',
      competitors: 'VMware (incumbent), HashiCorp, Pulumi. They demoed VMware last month. Budget cycle starts Q1.',
    },
  },

  'customer-churn-prevention': {
    workflowId: 'customer-churn-prevention',
    defaultTestCaseId: 'churn-prevention-default-1',
    description: 'Churn prevention for at-risk SaaS customers',
    inputPayload: {
      portfolioData: `Account | ARR | Health | Contract End | NPS | Login (30d)
TechCorp | $120K | Red | 60 days | 3 | 12 logins
DataFlow Inc | $85K | Yellow | 90 days | 6 | 45 logins
CloudFirst | $200K | Red | 45 days | 2 | 3 logins
MediaPro | $65K | Yellow | 120 days | 5 | 28 logins
BuildRight | $150K | Red | 30 days | 4 | 8 logins`,
      behaviorChanges: 'TechCorp: Champion left company, new stakeholder unresponsive. CloudFirst: Executive sponsor promoted, no replacement identified, missed last 2 QBRs. BuildRight: Mentioned budget cuts in last call, competitor demo scheduled.',
      industryContext: 'Tech spending down 15% industry-wide. Competitors offering aggressive discounts. Our recent price increase (8%) poorly received.',
      criticalAccount: 'CloudFirst - $200K ARR, enterprise customer for 3 years. Usage dropped 70% after executive sponsor Maria promoted. New contact (James) hasn\'t engaged. Renewal in 45 days. They implemented our competitor for a side project last month.',
      productUpdates: 'New enterprise dashboard launched. AI features added (they specifically asked for this last year). Dedicated CSM program now available. Flexible billing options.',
    },
  },

  'enterprise-account-expansion': {
    workflowId: 'enterprise-account-expansion',
    defaultTestCaseId: 'account-expansion-default-1',
    description: 'Enterprise account expansion opportunity analysis',
    inputPayload: {
      accountProfile: 'GlobalRetail Corp - $15B revenue, 500 stores, 45,000 employees. HQ in Chicago, operations in US and Canada. Major e-commerce push. Recently acquired online-only competitor. Known for innovation, early tech adopter.',
      currentFootprint: 'Using our Analytics Platform for e-commerce (started 2 years ago). 50 users, $75K ARR. Deployed in digital marketing team only. Features adopted: web analytics, A/B testing. Not using: customer journey, predictive insights.',
      productPortfolio: 'Analytics Platform ($75K-$500K), Customer Data Platform ($150K-$400K), Marketing Automation ($100K-$300K), AI Personalization ($200K-$600K). Cross-sell synergies between all products.',
      expansionOpportunities: 'Retail operations expressed interest in store analytics. Acquired company needs to migrate to enterprise platform. New CMO wants unified marketing stack. E-commerce team loves us, willing to advocate.',
      customerUsageData: 'NPS: 9/10. Login frequency: 200/day. Feature adoption: 75% of purchased. Support tickets: Low (2/month). Executive sponsor engaged. 3 case studies published.',
    },
  },

  'rfp-response-center': {
    workflowId: 'rfp-response-center',
    defaultTestCaseId: 'rfp-response-default-1',
    description: 'RFP response for government IT services contract',
    inputPayload: {
      rfpContent: `RFP #2024-IT-5892: Cloud Infrastructure Modernization Services
Agency: Department of Commerce
Value: $15M over 5 years
Requirements:
1. FedRAMP High authorization required
2. Migration of 150+ applications to cloud
3. 24/7 NOC support with 15-minute response SLA
4. Experience with legacy mainframe migration
5. Cleared personnel (Secret clearance minimum)
6. Small business subcontracting plan (23% goal)
Evaluation: Technical (50%), Past Performance (30%), Price (20%)
Due: 45 days`,
      companyCapabilities: 'FedRAMP High authorized. 15 years federal IT experience. 500+ cloud migrations completed. 24/7 NOC with 8-minute average response. Mainframe modernization practice. 200+ cleared engineers.',
      winThemes: '1. Proven FedRAMP experience (10+ agency deployments). 2. Mainframe-to-cloud expertise (saved DOL $20M). 3. Lowest risk - incumbent-like knowledge without incumbent relationship. 4. Innovation: AI-powered migration assessment. 5. Strong small business partnerships.',
      pastPerformance: 'DOL Cloud Migration - $8M, completed ahead of schedule. IRS Tax System Modernization - $12M, exceeded all SLAs. Treasury Data Center - $6M, zero security incidents.',
      solutionApproach: 'Phased approach: 1) Assessment (60 days), 2) Quick wins migration (6 months), 3) Complex apps (18 months), 4) Mainframe (12 months), 5) Optimization (ongoing). Agile methodology, bi-weekly demos.',
    },
  },

  'revops-optimization': {
    workflowId: 'revops-optimization',
    defaultTestCaseId: 'revops-default-1',
    description: 'Revenue operations analysis for SaaS company',
    inputPayload: {
      pipelineData: `Stage | Deals | Value | Avg Days | Win Rate
Qualification | 45 | $2.1M | 12 | 35%
Discovery | 32 | $1.8M | 18 | 45%
Solution | 24 | $1.4M | 25 | 55%
Proposal | 18 | $1.1M | 15 | 65%
Negotiation | 12 | $850K | 20 | 75%
Closed Won | 8 | $480K | - | 100%
Quota this quarter: $1.2M. Current forecast: $850K.`,
      historicalPerformance: 'Last 4 quarters win rate: 22%, 25%, 21%, 24%. Average deal size trending up ($45K to $60K). Sales cycle increasing (65 days to 82 days). Enterprise deals taking longer. Q4 historically 30% of annual revenue.',
      teamInfo: '8 AEs ($150K quota each = $1.2M/quarter). 4 SDRs. 2 SEs. No dedicated deal desk. AE tenure: 2 new (<6 months), 4 ramped, 2 senior. Territory: 4 enterprise, 4 mid-market.',
      winLossData: `Won: DataCorp $85K (fast cycle, strong champion), TechFlow $120K (competitive win vs Salesforce)
Lost: GlobalBank $200K (security requirements), StartupCo $45K (price), MegaCorp $300K (no decision)
Pattern: Losing deals with >5 stakeholders and >90 day cycles`,
      processDescription: 'Lead routing: round-robin. Stages: manual progression. Discounting: manager approval >15%. Quote-to-cash: 5-day average. Tools: Salesforce, Gong, Outreach. Pain points: inconsistent discovery, slow legal review.',
    },
  },

  'tech-debt-assessment': {
    workflowId: 'tech-debt-assessment',
    defaultTestCaseId: 'tech-debt-default-1',
    description: 'Technical debt assessment for legacy codebase',
    inputPayload: {
      codebaseInfo: 'E-commerce platform, 8 years old. 450K lines of code. Python/Django backend, React frontend. Monolith with some microservices (payment, notifications). 65% test coverage. Last major refactor: 3 years ago.',
      architectureContext: 'Monolith handling 80% of traffic. PostgreSQL (reaching capacity), Redis cache, Elasticsearch. AWS deployment, manual scaling. CI/CD exists but 45-minute build times. Feature flags via config files.',
      knownIssues: 'Payment module: spaghetti code, 12% of bugs. User auth: outdated library (security risk). Search: slow queries, N+1 problems. Mobile API: inconsistent, causing app crashes. Database: missing indexes, schema drift.',
      businessContext: 'Black Friday traffic 10x normal - system struggles. New features taking 3x longer than 2 years ago. Developer satisfaction declining. Planning international expansion requiring multi-currency, multi-language.',
      stakeholderAudience: 'Executive Leadership (C-Suite)',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  'financial-analysis-pack': {
    workflowId: 'financial-analysis-pack',
    defaultTestCaseId: 'financial-analysis-default-1',
    description: 'Q4 budget variance analysis for department review',
    inputPayload: {
      reportingPeriod: 'Q4 2024',
      budgetData: `Category | Budget
Personnel | $2,400,000
Technology | $800,000
Marketing | $600,000
Travel | $200,000
Professional Services | $300,000
Facilities | $400,000
Total | $4,700,000`,
      actualData: `Category | Actual
Personnel | $2,350,000
Technology | $920,000
Marketing | $480,000
Travel | $85,000
Professional Services | $450,000
Facilities | $395,000
Total | $4,680,000`,
      audienceLevel: 'Executive Leadership (C-Suite)',
      knownFactors: 'Technology overage: unplanned security upgrade after audit finding. Travel underspend: continued remote work. Marketing underspend: delayed campaign to Q1. Professional services overage: legal fees for acquisition.',
    },
  },

  'marketing-analytics-dashboard': {
    workflowId: 'marketing-analytics-dashboard',
    defaultTestCaseId: 'marketing-analytics-default-1',
    description: 'Marketing performance dashboard for multi-channel campaign',
    inputPayload: {
      marketingChannels: 'Paid Search (Google), Paid Social (LinkedIn, Meta), Organic Search, Email Marketing, Content Marketing, Events/Webinars',
      rawData: `Channel | Spend | Impressions | Clicks | Conversions | Revenue
Google Ads | $45,000 | 890,000 | 23,400 | 234 | $187,200
LinkedIn | $28,000 | 340,000 | 4,200 | 84 | $168,000
Meta Ads | $15,000 | 620,000 | 8,900 | 67 | $33,500
Email | $2,000 | 125,000 | 18,750 | 188 | $94,000
Organic | $0 | 450,000 | 31,500 | 315 | $157,500
Webinars | $8,000 | 2,400 | 890 | 156 | $234,000`,
      reportingFrequency: 'Monthly',
      primaryGoals: 'Lead Generation',
      targetAudience: 'CMO/Executive',
      dataIssues: 'LinkedIn attribution may be incomplete due to cookie restrictions. Email data missing mobile opens.',
    },
  },

  'program-governance-pack': {
    workflowId: 'program-governance-pack',
    defaultTestCaseId: 'program-governance-default-1',
    description: 'Quarterly steering committee pack for digital transformation',
    inputPayload: {
      programName: 'Enterprise Digital Transformation 2024',
      reportingPeriod: 'Q4 2024',
      statusSummary: 'Overall: AMBER. Phase 2 (Core Platform) on track. Phase 3 (Integration) facing delays. 67% of Q4 milestones completed. Strong executive engagement. Team capacity concerns.',
      milestoneStatus: `Completed: Core platform deployment (Oct), User migration Phase 1 (Nov), Security audit passed
In Progress: API integration (2 weeks delayed), Mobile app development (on track)
Upcoming: User migration Phase 2 (Jan), Go-live preparation (Feb)`,
      budgetStatus: 'Approved: $12M. Spent YTD: $8.2M (68%). Q4 Spend: $2.8M vs $3.0M planned. Forecast: $11.5M (-$500K under budget due to delayed contractor onboarding).',
      risks: `HIGH: Integration vendor capacity constraints - mitigation: backup vendor identified
MEDIUM: Change management adoption slower than planned - mitigation: additional training
MEDIUM: Q1 budget approval delay possible - mitigation: early submission`,
      decisions: '1. Approve $200K contingency for integration acceleration. 2. Confirm February go-live date or delay to March. 3. Approve additional change management resources.',
      audienceLevel: 'Executive Steering Committee',
    },
  },

  'contract-review-workflow': {
    workflowId: 'contract-review-workflow',
    defaultTestCaseId: 'contract-review-default-1',
    description: 'SaaS vendor contract review and negotiation',
    inputPayload: {
      contractText: `MASTER SERVICE AGREEMENT
Term: 3 years with auto-renewal (60-day notice to terminate)
Fees: $150,000/year, 5% annual increase
Payment: Net 45
SLA: 99.5% uptime, credits max 10% monthly fee
Liability: Capped at 12 months fees paid
Indemnification: Mutual, IP and data breach only
Data: Vendor may use anonymized data for product improvement
Security: SOC2 Type II, annual audits
Termination: For convenience with 90-day notice (penalty: remaining fees)
Governing Law: State of Delaware`,
      contractType: 'SaaS/Software Agreement',
      organizationStandards: 'Require: 99.9% SLA, uncapped liability for data breach, data deletion upon termination, right to audit, 30-day termination notice, no auto-renewal.',
      riskTolerance: 'Moderate (standard business terms)',
      counterparty: 'CloudVendor Inc.',
      dealValue: '$450K over 3 years',
    },
  },

  'automation-discovery-workflow': {
    workflowId: 'automation-discovery-workflow',
    defaultTestCaseId: 'automation-discovery-default-1',
    description: 'Automation assessment for invoice processing',
    inputPayload: {
      processName: 'Accounts Payable Invoice Processing',
      processDescription: `1. Receive invoice via email or mail (300/week)
2. Manual data entry into ERP (invoice #, vendor, amount, GL codes)
3. Three-way match: PO, receipt, invoice
4. Route for approval based on amount (VP for >$10K)
5. Resolve exceptions (20% of invoices)
6. Schedule payment based on terms
7. Update vendor records and reporting`,
      currentMetrics: 'Volume: 1,200 invoices/month. Processing time: 8 days average. Error rate: 4.5%. Cost per invoice: $15. FTEs: 3.5 (AP Clerks). Exception rate: 20%.',
      painPoints: 'Manual data entry errors causing payment delays. Slow approval routing. Duplicate invoice detection is manual. Month-end close bottleneck. Auditors flagging control gaps.',
      systemsInvolved: 'Email (Outlook), Scanning (Xerox), ERP (NetSuite), Excel (tracking), SharePoint (document storage), DocuSign (approvals for some).',
      constraints: 'Budget: $100K implementation + $30K/year. Must integrate with NetSuite. Cannot change approval thresholds without CFO sign-off. Union employees - cannot reduce headcount.',
      businessUnit: 'Finance / Accounts Payable',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GOVERNANCE WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // AI IMPLEMENTATION WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  'ai-implementation': {
    workflowId: 'ai-implementation',
    defaultTestCaseId: 'ai-implementation-default-1',
    description: 'Complete AI implementation journey for healthcare organization',
    inputPayload: {
      companyName: 'MedTech Health Systems',
      industry: 'Healthcare',
      companySize: 'Large (1001-5000)',
      aiUseCases: `1. Patient Risk Prediction - Use ML to identify patients at high risk of readmission within 30 days, enabling proactive intervention
2. Medical Imaging Analysis - AI-assisted analysis of radiology images (X-rays, MRIs, CT scans) to help radiologists identify potential issues faster
3. Appointment No-Show Prediction - Predict which appointments are likely to be missed and enable proactive outreach
4. Clinical Documentation Assistant - AI to help physicians generate clinical notes from voice recordings
5. Claims Denial Prediction - Predict which claims are likely to be denied and flag for review before submission`,
      strategicPriorities: `1. Reduce 30-day readmission rates by 20% to meet CMS quality targets
2. Improve radiologist productivity by 30% while maintaining accuracy
3. Reduce claim denial rate from 12% to 5%
4. Achieve CSAT score of 4.5/5 for patient experience
5. Maintain HIPAA compliance across all new technology implementations`,
      budgetRange: '$1M - $5M',
      timeline: '12-18 months',
      currentTechStack: `- Cloud: AWS (us-east-1, HIPAA-compliant)
- EHR: Epic Systems
- Data Warehouse: Snowflake Healthcare Edition
- Analytics: Tableau, some Python notebooks
- Integration: MuleSoft for system integration
- Security: CrowdStrike, Splunk for SIEM`,
      dataLandscape: `- Patient Demographics: 2M+ patient records in Epic
- Clinical Data: 10 years of lab results, diagnoses, procedures
- Imaging: 500K+ radiology images stored in PACS system
- Claims Data: 5 years of claims history (10M+ claims)
- Operational Data: Scheduling, appointments, capacity
- All data subject to HIPAA - PHI handling required`,
      teamCapabilities: `- 3 data scientists with healthcare experience
- 5 data engineers (familiar with Snowflake, Python)
- 2 ML engineers (mostly tabular data experience)
- No dedicated MLOps or AI platform experience
- Strong Epic integration team
- Security team experienced with HIPAA audits`,
      complianceRequirements: `- HIPAA (covered entity)
- HITECH Act
- State-specific health data privacy laws
- FDA guidance for AI/ML in medical devices (for imaging use case)
- CMS requirements for quality reporting
- HITRUST certification in progress`,
      additionalContext: `Recently appointed new Chief Digital Officer who is championing AI adoption. Board approved initial AI budget in last quarter. Some physician skepticism about AI replacing clinical judgment - need strong change management. Prior failed attempt at AI implementation 2 years ago due to data quality issues - need to address data foundation first. Epic has announced new AI features - need to evaluate build vs. buy for some use cases.`,
    },
  },

  'ai-data-protection-assessment': {
    workflowId: 'ai-data-protection-assessment',
    defaultTestCaseId: 'ai-data-protection-default-1',
    description: 'AI data protection assessment for enterprise SaaS company',
    inputPayload: {
      keySystemsInventory: `Production Systems:
- PostgreSQL (customer data) - AWS RDS
- MongoDB (product analytics) - Atlas
- Snowflake (data warehouse) - all data flows here
- S3 (file storage) - customer uploads

Business Systems:
- Salesforce (CRM) - customer PII
- HubSpot (marketing) - prospect data
- Zendesk (support) - tickets with PII
- Workday (HR) - employee data`,
      dataTypesProcessed: 'Customer PII (names, emails, addresses for 50K customers), Financial data (payment info via Stripe, not stored), Healthcare data (some customers in healthcare vertical - PHI), Employee HR data, Business analytics and usage data.',
      aiIntegrations: `Current:
- ChatGPT Enterprise (customer support drafting)
- GitHub Copilot (engineering - code completion)
- Grammarly Business (company-wide)
- Internal LLM (product recommendations, hosted on AWS)

Planned:
- AI chatbot for customer self-service
- Document processing automation
- Predictive churn analysis`,
      approvedAITools: 'ChatGPT Enterprise (approved via security review), GitHub Copilot (engineering only), Grammarly Business (no customer data). All others require security team approval.',
      dataResidencyRequirements: 'EU customers: data must stay in EU (Frankfurt region). Healthcare customers: HIPAA BAA required. Government customers: FedRAMP in progress. No customer data to China or Russia.',
      currentSecurityControls: 'SSO (Okta), MFA enforced, DLP on email (Proofpoint), encryption at rest (AES-256), encryption in transit (TLS 1.3), quarterly access reviews, annual penetration testing.',
      plannedAIExpansions: 'Q1: Customer service AI chatbot (will need access to knowledge base). Q2: Document OCR and processing. Q3: Predictive analytics on customer data. Q4: AI-powered search across all content.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// WAVE SKILLS TEST DATA (20 New Production Skills)
// ═══════════════════════════════════════════════════════════════════════════

export const WAVE_SKILLS_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  // Wave 1: Quick Wins
  'executive-decision-memo': {
    skillId: 'executive-decision-memo',
    defaultTestCaseId: 'exec-memo-cloud-migration',
    description: 'Cloud infrastructure migration decision',
    inputPayload: {
      decisionContext: 'Our company currently runs all applications on-premise with aging infrastructure (5+ years old). We\'re facing increasing maintenance costs, scaling challenges during peak seasons, and difficulty hiring ops talent. The CEO has asked for a recommendation on migrating to cloud infrastructure.',
      options: 'Option A: Full migration to AWS (move all workloads, estimated 12 months)\nOption B: Hybrid approach - keep sensitive workloads on-prem, move others to Azure (estimated 8 months)\nOption C: Maintain status quo with infrastructure refresh (replace aging hardware)',
      criteria: 'Cost (TCO over 5 years), Security/Compliance (we handle healthcare data - HIPAA), Time to implement, Team capability/training needs, Business continuity risk',
      background: 'Current infrastructure: 3 data centers, 200+ servers, 15 applications. Annual maintenance: $1.8M. Last major outage: 6 months ago (8 hours, cost $500K). Competitors have moved to cloud and reduced costs 30-40%. Our DevOps team (8 people) has AWS certifications but limited production experience. Previous cloud pilot in 2022 failed due to security concerns. Budget ceiling: $2M for migration. Must maintain HIPAA compliance. Max 4 hours downtime for critical systems.',
      audience: 'CEO and Executive Committee',
      urgency: 'thisMonth',
    },
  },
  'one-on-one-meeting-prep': {
    skillId: 'one-on-one-meeting-prep',
    defaultTestCaseId: 'one-on-one-performance',
    description: 'Performance discussion with senior engineer',
    inputPayload: {
      relationship: 'manager',
      personContext: 'Sarah is a Senior Software Engineer who has been on the team for 2.5 years. She was a top performer in her first year but has seemed less engaged lately. Her code quality remains high but she\'s been missing deadlines and seems frustrated in team meetings. Known strengths: technical depth, code quality, mentoring juniors. Development areas: stakeholder communication, deadline estimation.',
      recentContext: 'Last sprint: Delivered feature 3 days late, though quality was excellent. Skipped two team lunches. Had a tense exchange with PM about scope changes. Mentioned in passing that she\'s "not sure about her growth path here." Team just went through reorg - her close collaborator moved to another team.',
      topicsToDiscuss: '1. Check in on how she\'s feeling about the role and team\n2. Discuss the deadline slip and get her perspective\n3. Revisit career aspirations - tech lead path\n4. Address the PM interaction constructively\n5. Understand what support she needs from me',
      previousActions: 'From last 1:1: She was going to draft a tech lead development plan (hasn\'t happened). I was going to connect her with our Staff Engineer for mentorship (did happen, but only one meeting so far).',
      meetingGoal: 'performance',
    },
  },
  'team-retrospective-facilitator': {
    skillId: 'team-retrospective-facilitator',
    defaultTestCaseId: 'retro-post-launch',
    description: 'Post-launch retrospective for major release',
    inputPayload: {
      retroContext: 'Just completed a 3-month project to rebuild our checkout flow. Launched last week. The launch was successful (conversion rate up 23%, zero critical bugs) but the final month was intense with lots of late nights and weekend work.',
      teamContext: '8-person cross-functional team (4 engineers, 2 designers, 1 PM, 1 QA). Mix of remote (5) and in-office (3). Two engineers are new (joined during the project). There\'s some tension between design and engineering about last-minute changes. Psychological safety is generally good but people hesitate to call out leadership decisions. Team has been together 8 months.',
      format: 'starfish',
      duration: '90',
      previousActions: 'From last retro (2 months ago): 1. Implement design review checkpoint before dev starts (partially done). 2. Add QA to sprint planning (done). 3. Create escalation path for scope disagreements (not done).',
      knownIssues: 'Scope creep in final weeks, unclear decision-making authority between PM and design lead, testing bottleneck (only 1 QA), some team members showing signs of burnout.',
    },
  },
  'ab-test-analysis-reporter': {
    skillId: 'ab-test-analysis-reporter',
    defaultTestCaseId: 'ab-test-checkout-redesign',
    description: 'Checkout page redesign experiment results',
    inputPayload: {
      experimentContext: 'We redesigned the checkout page to reduce friction. Control: existing 3-step checkout. Treatment: new single-page checkout with accordion sections. Hypothesis: Single-page will increase conversion by reducing abandonment.',
      metrics: 'Primary: Checkout completion rate. Control: 68.2% (14,532 completions / 21,308 visitors). Treatment: 71.8% (15,847 completions / 22,071 visitors). Secondary: Average order value - Control $127.43, Treatment $124.89. Time to complete - Control 4.2 min, Treatment 3.1 min.',
      duration: 'Ran for 21 days. ~43,000 total visitors split 50/50. Traffic allocation was random by session ID.',
      segments: 'Mobile: Control 61.2%, Treatment 68.9%. Desktop: Control 72.1%, Treatment 73.4%. New users: Control 59.8%, Treatment 67.2%. Returning: Control 74.1%, Treatment 74.8%.',
      businessContext: 'Checkout is our highest-leverage conversion point. 1% improvement in checkout = ~$800K annual revenue. We\'ve had 3 failed checkout experiments in past year.',
      confidenceLevel: '95',
    },
  },

  // Wave 2: Strategic Differentiators
  'board-presentation-builder': {
    skillId: 'board-presentation-builder',
    defaultTestCaseId: 'board-q3-review',
    description: 'Q3 quarterly board review presentation',
    inputPayload: {
      presentationType: 'quarterly-review',
      audience: 'Board of 7 members: 2 VCs (focused on growth metrics and path to profitability), 2 independent directors (one former CFO, one former CEO of competitor), CEO, CFO, and founder/CTO. The VC board members have been pushing for faster growth; independent directors are more conservative.',
      keyMetrics: 'ARR: $12.3M (up 18% QoQ, target was 22%). Net retention: 108% (down from 115%). New customers: 47 (target 55). Churn: 3.2% (up from 2.1%). Runway: 18 months at current burn. Sales pipeline: $8.2M (up 34%).',
      strategicContext: 'Market is consolidating - two competitors acquired this quarter. Our enterprise segment is growing faster than SMB. We\'re seeing longer sales cycles (up 23%) but larger deal sizes. Team grew from 45 to 58 people.',
      askOrDecision: 'Seeking approval for $1.5M incremental investment in enterprise sales team (4 new AEs + 1 sales engineer). Also want to discuss potential acquisition of smaller competitor (early stage, $800K ARR, strong tech team).',
      timeAllocation: '45min',
    },
  },
  'prompt-engineering-optimizer': {
    skillId: 'prompt-engineering-optimizer',
    defaultTestCaseId: 'prompt-customer-email',
    description: 'Customer service email response prompt',
    inputPayload: {
      originalPrompt: 'Write a response to this customer complaint email. Be helpful and professional.',
      intendedTask: 'Generate personalized, empathetic customer service responses that resolve the issue, maintain brand voice, and leave the customer feeling heard. Should work for various complaint types (billing, product, shipping). Need consistent formatting with clear next steps.',
      currentIssues: 'Responses are too generic - they don\'t reference specific details from the customer\'s email. Tone varies wildly between overly formal and too casual. Sometimes the AI apologizes when it shouldn\'t (e.g., customer misunderstood policy). Responses are too long (customers want quick answers).',
      targetModel: 'claude',
      constraints: 'Response must be under 200 words. Must include: acknowledgment of issue, specific resolution/next steps, timeline if applicable. Cannot offer refunds over $100 without escalation note. Must maintain our friendly-but-professional brand voice.',
      exampleInputs: 'Example 1: "I ordered 3 weeks ago and still haven\'t received my package! Order #12345. This is ridiculous."\n\nExample 2: "You charged me twice for my subscription this month. I want a refund immediately."',
    },
  },
  'kpi-framework-designer': {
    skillId: 'kpi-framework-designer',
    defaultTestCaseId: 'kpi-product-team',
    description: 'Product team KPI framework design',
    inputPayload: {
      frameworkType: 'okr',
      scope: 'product',
      businessContext: 'B2B SaaS product team (12 people: 2 PMs, 6 engineers, 2 designers, 2 data analysts). Product is a project management tool for marketing teams. $8M ARR, 450 customers, 85% are SMB. Average contract is $18K/year.',
      strategicGoals: '1. Increase user engagement (too many customers are "shelf-ware" - paying but not using). 2. Improve enterprise readiness (larger deals require SSO, permissions, audit logs). 3. Reduce time-to-value for new customers (currently takes 3 weeks for customers to see value).',
      existingMetrics: 'Currently tracking: DAU/MAU (32%), feature adoption (varies), NPS (42), support tickets per customer, time to first project created. We have full product analytics via Amplitude.',
      timePeriod: 'quarterly',
    },
  },
  'ml-model-card-generator': {
    skillId: 'ml-model-card-generator',
    defaultTestCaseId: 'model-card-churn',
    description: 'Customer churn prediction model documentation',
    inputPayload: {
      modelName: 'CustomerChurnPredictor v2.3',
      modelType: 'classification',
      modelDetails: 'XGBoost classifier trained on 3 years of customer behavior data. 47 features including: usage metrics (login frequency, feature usage), billing (payment history, plan changes), support (ticket volume, sentiment), and firmographic data. Hyperparameters tuned via Bayesian optimization. Model size: 12MB.',
      intendedUse: 'Predict which customers are likely to churn in the next 90 days so Customer Success team can proactively intervene. Used in weekly batch scoring of all active customers. Results feed into Salesforce for CSM prioritization. Not intended for individual customer communication or pricing decisions.',
      trainingData: 'Training data: 125,000 customer records from Jan 2021 - Dec 2023. 8.2% positive class (churned). Data from production database + Mixpanel events + Zendesk. Known issues: enterprise customers underrepresented (only 12% of training data but 35% of revenue). Some features have 5-15% missing values (imputed with median).',
      performanceMetrics: 'Test set (20% holdout): AUC-ROC 0.84, Precision@10% 0.62, Recall@10% 0.48. Calibration: slight overconfidence in 0.7-0.9 probability range. Lift@10%: 4.2x vs random.',
      limitationsRisks: 'Model struggles with: new customers (<3 months tenure), customers with irregular usage patterns (seasonal businesses), enterprise customers (different behavior). Potential bias: model may underpredict churn for customers acquired through certain channels (limited training data). Model performance degrades if not retrained quarterly.',
    },
  },

  // Wave 3: Technical Excellence
  'sql-query-optimizer': {
    skillId: 'sql-query-optimizer',
    defaultTestCaseId: 'sql-slow-report',
    description: 'Slow customer analytics report query',
    inputPayload: {
      sqlQuery: `SELECT
  c.customer_id,
  c.company_name,
  c.created_at as customer_since,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) as total_orders,
  (SELECT SUM(amount) FROM orders o WHERE o.customer_id = c.customer_id) as total_revenue,
  (SELECT MAX(order_date) FROM orders o WHERE o.customer_id = c.customer_id) as last_order_date,
  (SELECT COUNT(*) FROM support_tickets t WHERE t.customer_id = c.customer_id AND t.status = 'open') as open_tickets
FROM customers c
WHERE c.status = 'active'
  AND c.created_at >= '2023-01-01'
  AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)
ORDER BY total_revenue DESC
LIMIT 1000;`,
      dbType: 'postgresql',
      tableSchema: `customers: ~500K rows (customer_id PK, company_name, status, created_at, updated_at)
orders: ~5M rows (order_id PK, customer_id FK, order_date, amount, status) - has index on customer_id
support_tickets: ~2M rows (ticket_id PK, customer_id FK, status, created_at) - no index on customer_id`,
      performanceIssue: 'This query runs every morning for our daily customer health report. Currently taking 45+ seconds. Sometimes times out at 60 seconds. Need to get it under 5 seconds.',
      dataVolume: 'large',
    },
  },
  'api-documentation-generator': {
    skillId: 'api-documentation-generator',
    defaultTestCaseId: 'api-doc-users',
    description: 'User management API documentation',
    inputPayload: {
      apiEndpoints: `// User Management Endpoints
POST /api/v1/users - Create new user (requires admin role)
GET /api/v1/users - List users (paginated, filterable)
GET /api/v1/users/:id - Get user by ID
PATCH /api/v1/users/:id - Update user
DELETE /api/v1/users/:id - Soft delete user

// User model
{
  id: uuid,
  email: string (unique),
  name: string,
  role: enum('admin', 'member', 'viewer'),
  status: enum('active', 'invited', 'suspended'),
  created_at: timestamp,
  updated_at: timestamp,
  last_login_at: timestamp | null,
  metadata: json
}`,
      apiType: 'rest',
      authMethod: 'bearer',
      targetAudience: 'external',
      additionalContext: 'Rate limit: 100 requests/minute per API key. Pagination default 20, max 100. Soft delete means user.status becomes "deleted" but record is retained for 90 days. Webhooks are sent for user.created, user.updated, user.deleted events.',
    },
  },
  'adr-writer': {
    skillId: 'adr-writer',
    defaultTestCaseId: 'adr-database-choice',
    description: 'Primary database selection ADR',
    inputPayload: {
      decisionTitle: 'Use PostgreSQL as primary database',
      context: 'We\'re building a new B2B SaaS application for project management. Need to choose a primary database. The application will have: complex relational data (projects, tasks, users, teams, permissions), need for full-text search, JSON storage for flexible metadata, and expected scale of 10K customers with avg 50 users each.',
      options: 'Option 1: PostgreSQL - mature, feature-rich, great JSON support, strong community\nOption 2: MySQL - widely known, good performance, simpler\nOption 3: MongoDB - flexible schema, easy to start, native JSON\nOption 4: CockroachDB - PostgreSQL compatible, distributed, auto-scaling',
      decision: 'PostgreSQL. It offers the best balance of features we need (JSONB, full-text search, complex queries) with maturity and team familiarity. While CockroachDB is interesting, we don\'t need distributed capabilities yet and it adds operational complexity.',
      stakeholders: 'CTO (final decision), Backend Lead (implementation), DevOps Lead (operations), DBA consultant (reviewed options)',
      constraints: 'Team has strong PostgreSQL experience (4/6 backend engineers). Need to launch MVP in 3 months. Budget is limited so managed hosting preferred. Must support our CI/CD pipeline and infrastructure-as-code approach.',
    },
  },
  'data-quality-assessment': {
    skillId: 'data-quality-assessment',
    defaultTestCaseId: 'dq-customer-data',
    description: 'Customer master data quality assessment',
    inputPayload: {
      dataDescription: 'Customer master data table in our data warehouse. ~150K customer records integrated from: Salesforce CRM, Stripe billing, Intercom support, product database. Key fields: customer_id, company_name, domain, industry, employee_count, arr, health_score, csm_owner, created_date.',
      qualityIssues: 'Known problems: duplicate companies with slightly different names, missing industry for ~30% of records, employee_count seems wrong for many companies (shows 1 for enterprises), health_score calculation failing for some customers, some customers have multiple Stripe IDs.',
      businessContext: 'This data feeds our customer 360 dashboard, renewal forecasting model, and CSM territory assignments. Bad data = CSMs working with wrong info, inaccurate forecasts, and missed upsell opportunities. CEO mentioned data quality issues in last all-hands.',
      dataProfile: 'company_name: 0% null, ~3% look like duplicates\ndomain: 8% null\nindustry: 31% null\nemployee_count: 2% null, 15% value = 1\narr: 0% null, some negative values\nhealth_score: 12% null\ncsm_owner: 18% null',
      qualityDimensions: 'all',
    },
  },

  // Wave 4: Advanced Capabilities
  'rag-system-design': {
    skillId: 'rag-system-design',
    defaultTestCaseId: 'rag-support-kb',
    description: 'Customer support knowledge base RAG system',
    inputPayload: {
      useCase: 'Build an AI-powered support chatbot that can answer customer questions using our existing knowledge base. Should reduce ticket volume by handling common questions, provide 24/7 support, and help support agents find answers faster. Must cite sources and know when to escalate to human.',
      dataSource: 'Sources to index: ~500 help articles (Zendesk), ~1000 past ticket resolutions (summarized), 50 product docs (Notion), 20 how-to videos (transcripts), release notes (last 2 years). Total ~2M words. Content updated weekly. Mix of technical and non-technical content.',
      scale: 'medium',
      latencyReq: 'interactive',
      constraints: 'Must run on our existing AWS infrastructure. Budget $2K/month for AI costs. Team has Python experience but limited ML expertise. Need to maintain data privacy (no customer data in prompts). Must integrate with existing Zendesk workflow.',
    },
  },
  'ai-ethics-review': {
    skillId: 'ai-ethics-review',
    defaultTestCaseId: 'ethics-hiring-ai',
    description: 'AI-powered resume screening tool ethics review',
    inputPayload: {
      systemDescription: 'AI system that screens resumes for job applications. Takes in resume text and job description, outputs a match score (0-100) and key qualification gaps. HR uses this to prioritize which candidates to interview first. Currently in pilot with 3 job postings.',
      affectedGroups: 'Job applicants (diverse backgrounds, ages, education levels), hiring managers (rely on scores for decisions), HR team (uses tool daily), company (reputation risk), unsuccessful candidates (may never know AI was involved)',
      dataUsed: 'Training data: 50,000 historical resumes labeled as "hired" or "not hired" from past 5 years. Features extracted: skills keywords, years of experience, education level, job titles. No explicit demographic data but names and graduation years are present in training data.',
      riskLevel: 'high',
      regulatoryContext: 'Operating in US (federal contractors require OFCCP compliance) and EU (GDPR, proposed AI Act would classify as high-risk). NYC Local Law 144 requires bias audits for automated employment decision tools. Company has DEI commitments and public diversity goals.',
    },
  },
  'process-automation-spec': {
    skillId: 'process-automation-spec',
    defaultTestCaseId: 'automation-invoice',
    description: 'Invoice processing automation specification',
    inputPayload: {
      processDescription: 'Current invoice processing: 1) Vendor emails invoice PDF to AP team. 2) AP clerk manually opens email, downloads PDF. 3) Clerk logs into accounting system, creates new invoice record. 4) Clerk manually enters invoice number, vendor, line items, amounts. 5) Clerk matches to PO if applicable. 6) Routes to manager for approval (email). 7) Manager reviews, approves in accounting system. 8) Payment scheduled. Takes 15-30 min per invoice.',
      painPoints: 'Manual data entry is slow and error-prone (5% error rate). Lost invoices when emails are missed. No visibility into invoice status. Late payment penalties ($20K last year). AP team of 3 processing 800 invoices/month. 40% of their time is data entry.',
      systems: 'Gmail for invoice receipt, NetSuite for accounting, DocuSign for some contracts, Slack for internal comms, Notion for PO tracking spreadsheet. No current integrations between systems.',
      volume: 'high',
      constraints: 'Budget: $50K implementation + $1K/month ongoing. NetSuite API access available. Must maintain audit trail for SOX compliance. AP team not technical (need low-code solution). Want to pilot with one vendor before full rollout.',
    },
  },
  'crisis-communication-playbook': {
    skillId: 'crisis-communication-playbook',
    defaultTestCaseId: 'crisis-data-breach',
    description: 'Data breach crisis communication playbook',
    inputPayload: {
      crisisType: 'data-breach',
      situation: 'Discovered unauthorized access to customer database. Attacker exploited unpatched vulnerability and had access for ~2 weeks. Affected data: names, emails, hashed passwords for approximately 50,000 customers. No financial data exposed. Attack vector identified and patched. Forensics ongoing.',
      stakeholders: 'Affected customers (50K), all customers (200K), employees (150), board of directors, investors, media (we\'re a known brand in our space), regulators (GDPR for EU customers, state AGs for US), security researchers who might discover, partners who integrate with us',
      companyContext: 'B2B SaaS company, 200K customers, mid-market focus. First significant security incident. Strong brand reputation for reliability. Publicly known company in our industry. CISO hired 6 months ago and has been improving security posture.',
      timeline: 'immediate',
    },
  },

  // Wave 5: Comprehensive Coverage
  'all-hands-meeting-script': {
    skillId: 'all-hands-meeting-script',
    defaultTestCaseId: 'all-hands-q4',
    description: 'Q4 kickoff all-hands meeting script',
    inputPayload: {
      meetingPurpose: 'quarterly',
      keyTopics: 'Q3 results (beat revenue target, missed hiring target), Q4 priorities (enterprise push, platform reliability), org changes (new VP Sales starting, engineering reorg into squads), recognition (product launch team, sales winners), preview of 2024 planning process, open Q&A',
      audienceSize: 'medium',
      duration: '60min',
      tone: 'inspiring',
    },
  },
  'rfp-response-generator': {
    skillId: 'rfp-response-generator',
    defaultTestCaseId: 'rfp-enterprise',
    description: 'Enterprise software RFP response',
    inputPayload: {
      rfpSummary: 'Fortune 500 manufacturing company seeking project management software for 5,000 users. Key requirements: SSO integration (Okta), advanced permissions, audit logging, 99.9% SLA, on-prem deployment option, migration from legacy system (MS Project Server). Timeline: decision in 60 days, implementation complete in 6 months. Evaluation criteria: functionality (35%), security (25%), price (20%), implementation plan (20%).',
      companyCapabilities: 'Our PM software: 450 enterprise customers, SOC 2 Type II certified, supports SSO (Okta, Azure AD, Ping), granular permissions with custom roles, full audit logging with SIEM integration, 99.95% actual uptime last year, cloud-only (no on-prem). Professional services team for enterprise migrations.',
      differentiators: '1) Best-in-class UX (NPS 65 vs industry avg 32), 2) Fastest implementation (avg 8 weeks vs competitor 16 weeks), 3) Modern API enabling deep integrations, 4) AI-powered resource optimization unique in market, 5) Named customer success manager for all enterprise accounts',
      competitors: 'Likely competing against: Monday.com (strong brand, weaker enterprise features), Smartsheet (good enterprise but clunky UX), MS Project (incumbent, strong MS relationship). We\'ve won 7 of last 10 deals against Monday in enterprise.',
      dealSize: 'large',
    },
  },
  'role-transition-playbook': {
    skillId: 'role-transition-playbook',
    defaultTestCaseId: 'transition-promotion',
    description: 'Senior engineer to engineering manager transition',
    inputPayload: {
      transitionType: 'internal-promotion',
      roleDescription: 'Engineering Manager for the Platform team (6 engineers). Responsible for team health, career development, sprint planning, stakeholder management, hiring. Reports to VP Engineering. Team owns core infrastructure: APIs, database, authentication, deployment pipeline.',
      criticalKnowledge: 'Systems: deep knowledge of our API architecture, incident response procedures, deployment pipeline. Processes: sprint planning approach, on-call rotation, code review standards. Relationships: key stakeholders in Product (PM for platform), DevOps (shared services), and Security (compliance requirements). History: why we made certain architectural decisions, past incidents and lessons learned.',
      timeline: '30days',
      context: 'Previous manager left suddenly (new opportunity). Team has been self-managing for 2 weeks. Two team members also applied for the role and didn\'t get it. Q4 is our busiest quarter with a major platform upgrade planned.',
    },
  },
  'skills-development-path': {
    skillId: 'skills-development-path',
    defaultTestCaseId: 'skills-pm-career',
    description: 'Product management career development path',
    inputPayload: {
      targetSkill: 'Product Management',
      currentLevel: 'intermediate',
      goals: 'Currently a PM for 2 years at a mid-stage startup. Want to become a Senior PM in next 12-18 months, eventually move into product leadership (Director/VP). Specifically want to improve in: strategy and roadmapping, stakeholder management, data/analytics, and leading larger initiatives.',
      timeCommitment: '10hrs',
      learningStyle: 'mixed',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNTING SKILLS DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const ACCOUNTING_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'tax-season-workflow-optimizer': {
    skillId: 'tax-season-workflow-optimizer',
    defaultTestCaseId: 'tax-season-pool-spa-clients',
    description: 'Tax season workflow for CPA firm serving pool/spa construction companies',
    inputPayload: {
      firmSize: 'Small (1-5 CPAs)',
      clientCount: '85 active clients, 12 are pool/spa construction companies with complex depreciation schedules',
      currentWorkflow: 'Manual tracking in Excel, QuickBooks Online for bookkeeping, Drake Tax for preparation. No automated client reminders. Partners review all returns manually.',
      painPoints: 'Document collection takes 3+ weeks per client, no standardized intake process, deadline tracking is manual, staff overtime exceeds 200 hours during peak season',
      softwareStack: 'Drake Tax, QuickBooks Online, Microsoft Office, basic Dropbox for file sharing',
      deadlineConstraints: 'Extension deadline October 15, corporate returns March 15, individual returns April 15. 40% of clients file extensions.',
    },
  },
  'client-financial-health-summary': {
    skillId: 'client-financial-health-summary',
    defaultTestCaseId: 'pool-builder-financial-health',
    description: 'Financial health summary for a pool construction company',
    inputPayload: {
      clientName: 'Bluewater Custom Pools',
      industry: 'Pool & Spa Construction',
      financialData: 'Revenue: $4.2M (up 12% YoY), COGS: $2.8M, Gross Margin: 33%, Net Income: $380K, Current Ratio: 1.8, Quick Ratio: 0.9, AR Days: 52, AP Days: 38, Inventory Turnover: 6.2x, Debt-to-Equity: 1.4',
      comparativePeriod: 'Prior Year: Revenue $3.75M, Gross Margin 31%, Net Income $310K, Current Ratio: 1.6',
      additionalContext: 'Seasonal business - 70% of revenue in April-September. Recently took on $500K equipment loan for new excavation equipment. Owner wants to expand into hot tub installations.',
      reportingPurpose: 'Advisory',
    },
  },
  'engagement-letter-generator': {
    skillId: 'engagement-letter-generator',
    defaultTestCaseId: 'pool-company-engagement',
    description: 'Engagement letter for new pool construction company client',
    inputPayload: {
      clientName: 'Sunrise Pool Builders LLC',
      engagementType: 'Tax Preparation + Advisory',
      servicesScope: 'Annual corporate tax return (1120S), quarterly payroll tax filings, sales tax compliance for pool equipment, monthly bookkeeping review, annual financial statements, advisory on equipment depreciation strategy',
      feeStructure: 'Monthly retainer of $2,500 for bookkeeping and advisory, plus $4,500 for annual tax preparation. Additional hourly rate of $275 for special projects.',
      clientIndustry: 'Construction / Pool Installation',
      specialConsiderations: 'Multi-state sales tax nexus (TX, OK, AR), percentage-of-completion accounting for large projects over $100K, Section 179 depreciation elections for heavy equipment',
    },
  },
  'audit-workpaper-reviewer': {
    skillId: 'audit-workpaper-reviewer',
    defaultTestCaseId: 'pool-service-audit-review',
    description: 'Review audit workpapers for pool service company',
    inputPayload: {
      auditType: 'Financial Statement Audit',
      clientName: 'AquaCare Pool Services Inc',
      workpaperSections: 'Revenue recognition testing (subscription pool service contracts), Accounts receivable confirmations, Inventory observation (chemicals and supplies), Fixed asset roll-forward (service vehicles and equipment), Payroll testing (seasonal workforce 15-45 employees)',
      materialityThreshold: 'Overall materiality: $50,000, Performance materiality: $37,500, Trivial threshold: $2,500',
      riskAreas: 'Revenue cutoff around seasonal transitions, inventory valuation of pool chemicals with shelf life, classification of repair vs capital improvement, related party transactions with owner-operated supply company',
      additionalContext: 'First-year audit engagement. Prior year was a review engagement by different firm.',
    },
  },
  'year-end-close-checklist-generator': {
    skillId: 'year-end-close-checklist-generator',
    defaultTestCaseId: 'pool-builder-year-end',
    description: 'Year-end close checklist for pool construction company',
    inputPayload: {
      entityType: 'S-Corporation',
      industry: 'Construction - Pool & Spa',
      accountingMethod: 'Accrual basis with percentage-of-completion for contracts over $100K',
      closingDate: 'December 31, 2025',
      keyAccounts: 'Construction-in-progress (8 active projects), Equipment assets ($1.2M), Warranty liability reserve, Retainage receivable, Seasonal line of credit ($300K)',
      specialItems: 'Need to evaluate WIP projects for revenue recognition, reconcile retainage balances, calculate officer reasonable compensation for S-Corp, review Section 199A deduction eligibility, evaluate estimated tax payments',
    },
  },
  '1099-w2-compliance-tracker': {
    skillId: '1099-w2-compliance-tracker',
    defaultTestCaseId: 'pool-company-1099-compliance',
    description: '1099/W-2 compliance tracking for pool company with subcontractors',
    inputPayload: {
      entityName: 'Paradise Pools & Spas LLC',
      taxYear: '2025',
      workerData: '22 W-2 employees (8 year-round, 14 seasonal April-October), 15 subcontractors (excavation, electrical, plumbing, concrete, landscaping), 3 vendor payments over $600 threshold',
      currentStatus: 'W-2s not yet prepared, 1099-NEC forms not yet issued. Missing TIN for 3 subcontractors. One subcontractor disputes classification.',
      complianceDeadlines: 'W-2 to employees by Jan 31, 1099-NEC to contractors by Jan 31, File with SSA/IRS by Jan 31',
      knownIssues: 'One worker classified as contractor may need W-2 reclassification (works set hours, uses company equipment). Missing W-9 from 3 subcontractors. Need backup withholding calculation for missing TINs.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// STAFFING SKILLS DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const STAFFING_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'candidate-screening-scorecard': {
    skillId: 'candidate-screening-scorecard',
    defaultTestCaseId: 'ppc-specialist-screening',
    description: 'Screening scorecard for PPC Specialist role at digital marketing agency',
    inputPayload: {
      jobTitle: 'PPC Specialist - Google Ads',
      jobRequirements: 'Google Ads certified, 3+ years managing $50K+/month in ad spend, experience with lead generation campaigns, familiarity with Looker Studio, agency experience preferred, pool/spa or home services vertical a plus',
      candidateResume: 'Sarah Mitchell - 4 years at digital agency managing Google Ads for 20+ accounts. Google Ads Search and Display certified. Managed $80K/month across home services clients. Built Looker Studio dashboards. Increased lead volume 40% for HVAC client. BS Marketing, University of Houston.',
      screeningCriteria: 'Technical: Google Ads proficiency, analytics capability, budget management. Soft: Client communication, agency pace adaptability, attention to detail. Bonus: Pool/spa industry knowledge, PMax experience, script automation',
      additionalContext: 'This is for the SSP agency (Small Screen Producer) managing 45+ pool/spa Google Ads accounts. Need someone who can hit the ground running with minimal training.',
    },
  },
  'client-intake-requirements-builder': {
    skillId: 'client-intake-requirements-builder',
    defaultTestCaseId: 'ssp-pool-builder-intake',
    description: 'Client intake for new pool builder seeking PPC management',
    inputPayload: {
      clientName: 'Crystal Clear Pools',
      serviceRequested: 'Google Ads Management - Lead Generation',
      industryVertical: 'Pool & Spa Construction',
      clientBackground: 'Family-owned pool builder in Dallas-Fort Worth area, 15 years in business, 3 crews, builds 60-80 pools/year. Currently doing $3.2M revenue. Previous agency managed Google Ads but they were unhappy with lead quality.',
      budgetRange: '$3,000-5,000/month Google Ads spend plus management fee',
      additionalContext: 'They also want social media management eventually but starting with PPC only. Peak season is March-September. They have a website but it needs work (slow load, no mobile optimization).',
    },
  },
  'candidate-market-intelligence-brief': {
    skillId: 'candidate-market-intelligence-brief',
    defaultTestCaseId: 'ppc-talent-market-brief',
    description: 'Market intelligence for hiring PPC specialists in Houston market',
    inputPayload: {
      roleTitle: 'PPC Specialist / Google Ads Manager',
      marketLocation: 'Houston, TX (hybrid or remote)',
      industryContext: 'Digital marketing agency specializing in pool/spa industry. Need specialist comfortable managing 45+ accounts at agency pace.',
      compensationRange: '$55,000-75,000 base + performance bonus',
      competitorEmployers: 'Other Houston agencies: Forthea, Envision Creative, Digital Reach Agency. Also competing with in-house roles at pool manufacturers like Pentair, Hayward.',
      additionalContext: 'Struggling to find candidates with both agency experience and willingness to specialize in one vertical (pool/spa). Last 3 hires left within 6 months.',
    },
  },
  'placement-success-predictor': {
    skillId: 'placement-success-predictor',
    defaultTestCaseId: 'ppc-placement-prediction',
    description: 'Predict placement success for PPC specialist candidate at SSP',
    inputPayload: {
      candidateProfile: 'James Rodriguez - 5 years PPC experience, last 3 at agency managing home services accounts. Google Ads certified. Left previous agency due to burnout (was managing 60+ accounts solo). Strong technical skills but interview revealed hesitation about "just pool companies."',
      roleRequirements: 'Manage 45+ Google Ads accounts for pool/spa companies. Weekly triage and optimization. Build Looker Studio reports. Work with account managers on client calls. Expected to use automation scripts.',
      culturalFactors: 'SSP is fast-paced, small team, collaborative. Work is seasonal (intense spring/summer, lighter winter). Remote-friendly but team meetings are important. Vertical specialization is a feature, not a bug.',
      historicalData: 'Past hires: 2 lasted 6+ months (both had industry-specific experience), 3 left within 6 months (all generalists who found vertical focus limiting). Success pattern: candidates who see vertical expertise as career differentiator.',
      additionalContext: 'Candidate is strong technically but "hesitation about just pool companies" is a yellow flag based on our turnover pattern.',
    },
  },
  'recruiting-pipeline-dashboard-designer': {
    skillId: 'recruiting-pipeline-dashboard-designer',
    defaultTestCaseId: 'ssp-recruiting-dashboard',
    description: 'Recruiting pipeline dashboard for SSP hiring multiple roles',
    inputPayload: {
      openRoles: 'PPC Specialist (1), Social Media Manager (1), Content Writer - Pool Industry (1), Account Manager (1)',
      currentPipeline: 'PPC: 12 applicants, 4 phone screens, 2 interviews scheduled. Social: 8 applicants, 2 phone screens. Content: 15 applicants, 6 phone screens, 3 interviews done, 1 offer pending. Account Mgr: 5 applicants, 1 phone screen.',
      recruitingSources: 'Indeed, LinkedIn, industry job boards (Pool & Hot Tub Alliance), employee referrals, university partnerships (University of Houston Marketing program)',
      targetMetrics: 'Time to fill: 30 days. Cost per hire: <$2,000. Offer acceptance rate: >80%. 90-day retention: >85%.',
      additionalContext: 'Peak hiring season is January-February to have team ready for spring ramp. Budget is tight — prefer organic recruiting over paid job posts.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE ADS SKILLS DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const GOOGLE_ADS_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'google-ads-account-auditor': {
    skillId: 'google-ads-account-auditor',
    defaultTestCaseId: 'pool-builder-audit-ssp',
    description: 'Account audit for pool builder Google Ads at SSP agency',
    inputPayload: {
      accountName: 'Bluewater Custom Pools - Dallas',
      accountOverview: 'Account structure: 3 Search campaigns (Pool Installation, Pool Renovation, Hot Tub), 1 PMax campaign, 1 Demand Gen. Match types: mix of exact and phrase. Daily budgets: Search $80, $40, $30; PMax $60; DG $25. Geo: DFW metro 40-mile radius.',
      performanceData: 'Last 30 days: 45,200 impressions, 3,100 clicks, 6.9% CTR, 42 conversions, 1.35% conv rate, $68.50 CPL, $2,877 spend. 60-day trend: CPL increased from $58 to $68. 90-day: CTR declining from 7.8% to 6.9%.',
      searchTermData: 'Top terms: "pool builder dallas" (12 conv), "custom pool installation" (8 conv), "inground pool cost dallas" (5 conv). Waste: "pool table dallas" ($180), "above ground pool" ($95), "diy pool" ($62), "pool cleaning jobs" ($45). 15% of spend going to zero-conversion terms.',
      conversionSetup: 'Conversion actions: Form submission (primary), Phone call 60s+ (primary), Chat initiated (secondary). Using GTM for form tracking, CallRail for phone. GA4 connected but goals not imported. Last conversion 2 days ago.',
      adExtensions: 'Sitelinks: 4 active. Callouts: 3 (need minimum 4). No structured snippets. Call extension active. Location extension active. No image extensions.',
      industryContext: 'Pool & Spa / Swimming Pool',
      knownIssues: 'CPL has been rising for 8 weeks. Client mentioned competitor "Premier Pools" is bidding more aggressively. PMax campaign seems to be cannibalizing brand search traffic.',
    },
  },
  'search-term-negative-keyword-engine': {
    skillId: 'search-term-negative-keyword-engine',
    defaultTestCaseId: 'pool-search-terms-ssp',
    description: 'Search term analysis for pool builder accounts at SSP',
    inputPayload: {
      accountName: 'Bluewater Custom Pools - Dallas',
      searchTermsReport: 'pool table near me | $42 | 18 clicks | 0 conv\nabove ground pool dallas | $38 | 15 clicks | 0 conv\npool cleaning service dallas | $35 | 14 clicks | 0 conv\nhow to build a pool yourself | $28 | 11 clicks | 0 conv\npool jobs dallas | $22 | 9 clicks | 0 conv\nswimming pool builder near me | $18 | 7 clicks | 3 conv\ncustom pool design dallas | $15 | 6 clicks | 2 conv\npool renovation cost | $12 | 5 clicks | 1 conv\npool supplies dallas | $25 | 10 clicks | 0 conv\nday spa dallas | $18 | 7 clicks | 0 conv',
      existingNegatives: 'Current negative list: pool table, billiard, inflatable pool, kiddie pool, public pool, ymca, pool noodle',
      campaignType: 'Search + PMax',
      monthlyBudget: '$6,500/month',
      additionalContext: 'This is a biweekly review. Client builds in-ground custom pools only (no above-ground, no service/maintenance, no hot tubs). Service area: Dallas-Fort Worth metro.',
    },
  },
  'client-report-narrative-generator': {
    skillId: 'client-report-narrative-generator',
    defaultTestCaseId: 'pool-monthly-report-ssp',
    description: 'Monthly report narrative for pool builder at SSP agency',
    inputPayload: {
      clientName: 'Bluewater Custom Pools',
      reportingPeriod: 'February 2026',
      performanceData: 'February: 28 leads, $72 CPL, $2,016 spend, 1.2% conv rate, 42,000 impressions. January: 35 leads, $65 CPL, $2,275 spend, 1.5% conv rate. February last year: 22 leads, $81 CPL.',
      keyChanges: 'Added 45 negative keywords from search term review. Paused underperforming RSA in Pool Installation campaign. Increased PMax budget by $10/day. Submitted new image assets for PMax.',
      clientContext: 'Pool builder in Dallas. Peak season starts March. Client wants to increase budget for spring. Last call: client asked about lead quality — said 3 of last 10 leads were "tire kickers."',
      callDate: 'March 5, 2026 at 2:00 PM CT',
      audienceType: 'Client (non-technical pool company owner)',
    },
  },
  'rsa-ad-copy-generator': {
    skillId: 'rsa-ad-copy-generator',
    defaultTestCaseId: 'pool-builder-rsa-ssp',
    description: 'RSA ad copy for pool builder in Dallas market',
    inputPayload: {
      businessName: 'Bluewater Custom Pools',
      serviceOffered: 'Custom in-ground pool design and installation',
      targetLocation: 'Dallas-Fort Worth, TX metro area',
      uniqueSellingPoints: '25 years experience, 3D design visualization, financing available, lifetime structural warranty, BBB A+ rated, over 1,000 pools built',
      targetKeywords: 'pool builder dallas, custom pool installation, inground pool cost dallas, swimming pool contractor dfw',
      competitorDifferentiators: 'Only builder in DFW offering 3D virtual reality pool design walkthrough. Lifetime warranty vs competitors 10-year. In-house excavation (no subcontractors for dig).',
      currentAdPerformance: 'Current RSA CTR: 6.9%. Top performing headline: "Custom Pools Starting at $45K". Lowest CTR headline: "Dallas Pool Installation Company". Description with highest CTR mentions financing.',
      campaignGoal: 'Lead Generation (form fills + phone calls)',
    },
  },
  'pmax-asset-health-monitor': {
    skillId: 'pmax-asset-health-monitor',
    defaultTestCaseId: 'pool-pmax-audit-ssp',
    description: 'PMax asset health audit for pool builder at SSP',
    inputPayload: {
      accountName: 'Bluewater Custom Pools - Dallas',
      assetGroupOverview: 'Asset Group 1: Pool Installation (8 headlines, 4 descriptions, 12 images, 1 video). Asset Group 2: Pool Renovation (6 headlines, 3 descriptions, 8 images, 0 videos). Asset Group 3: Hot Tub Installation (5 headlines, 2 descriptions, 5 images, 0 videos).',
      assetPerformance: 'AG1: 3 headlines "Best", 2 "Good", 3 "Low". 2 images "Low" rated (stock photos). AG2: 1 headline "Best", 2 "Good", 3 "Learning". AG3: All assets still "Learning" (launched 2 weeks ago).',
      audienceSignals: 'AG1: In-market Pool & Spa, Custom Home Building interest, Homeowners 35-65, HHI $100K+. AG2: In-market Home Renovation, existing pool owners. AG3: In-market Hot Tub, backyard renovation.',
      conversionData: 'AG1: 28 conversions, $62 CPA. AG2: 8 conversions, $85 CPA. AG3: 2 conversions, $110 CPA.',
      searchCampaignImpact: 'Since PMax launch: Search brand impression share dropped from 92% to 78%. Search non-brand CPL increased 15%. Suspect PMax is absorbing brand queries.',
      additionalContext: 'Client approved $60/day PMax budget. Need to assess whether AG3 (hot tubs) is worth continuing or if budget should shift to AG1 (pool installation) which performs best.',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SEO SKILLS DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const SEO_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'backlink-acquisition-strategy-generator': {
    skillId: 'backlink-acquisition-strategy-generator',
    defaultTestCaseId: 'pool-builder-backlinks',
    description: 'Backlink strategy for pool builder website',
    inputPayload: {
      websiteUrl: 'https://www.bluewatercustompools.com',
      competitorUrls: 'https://www.premierpoolsandspas.com\nhttps://www.anthonysylvan.com\nhttps://www.riverbendpools.com',
      currentBacklinkProfile: 'DA: 28, Total backlinks: 1,200, Referring domains: 180, Anchor text: 45% branded, 20% naked URL, 15% generic, 12% partial match, 8% exact match. Top linking domains: local chamber of commerce, BBB, Houzz, home improvement directories.',
      industryNiche: 'Home Services',
      targetKeywords: 'custom pool builder dallas - #8\ninground pool cost dallas - #12\npool installation dallas fort worth - #15\nluxury pool design texas - #22',
      contentAssets: '12 blog posts about pool design, 1 pool cost calculator, 50 project gallery pages with before/after photos, 3 video testimonials on YouTube',
      linkBuildingBudget: 'Growth ($500-2000/mo)',
      geographicFocus: 'Dallas-Fort Worth metro, Texas state',
      additionalContext: 'Seasonal business — want to build link authority before spring peak season. Main competitor (Premier Pools) has DA 55 with 2,000+ referring domains.',
    },
  },
  'ecommerce-product-page-seo-optimizer': {
    skillId: 'ecommerce-product-page-seo-optimizer',
    defaultTestCaseId: 'pool-equipment-product-page',
    description: 'Product page SEO for pool equipment retailer',
    inputPayload: {
      productName: 'Pentair IntelliFlo3 VSF Variable Speed Pool Pump',
      productCategory: 'Pool Equipment > Pool Pumps > Variable Speed Pumps',
      productDetails: 'Energy-efficient variable speed pool pump. Flow rates: 12-142 GPM. HP: 3.0 THP. Voltage: 230V. Energy Star certified. Built-in timer and diagnostics. WiFi-enabled for remote monitoring via ScreenLogic app. Dimensions: 24.5" x 12.5" x 14.8". Weight: 42 lbs. Warranty: 3-year limited. Price: $1,299.99.',
      targetKeyword: 'Pentair IntelliFlo3 pool pump',
      competitorProductUrls: 'https://www.poolsupplyworld.com/pentair-intelliflo3\nhttps://www.intheswim.com/pentair-variable-speed-pumps',
      currentProductUrl: 'https://www.bluewaterpoolsupply.com/pumps/pentair-intelliflo3-vsf',
      platformType: 'Shopify',
      brandVoice: 'Professional / Technical',
      additionalContext: 'This is our top-selling pump. Currently ranking #18 for "Pentair IntelliFlo3" and #45 for "variable speed pool pump." Want to improve rankings and add rich results.',
    },
  },
  'competitor-seo-analysis-report': {
    skillId: 'competitor-seo-analysis-report',
    defaultTestCaseId: 'pool-builder-seo-competition',
    description: 'Competitor SEO analysis for pool builder vs top competitors',
    inputPayload: {
      yourWebsite: 'https://www.bluewatercustompools.com',
      competitorWebsites: 'https://www.premierpoolsandspas.com\nhttps://www.anthonysylvan.com\nhttps://www.riverbendpools.com\nhttps://www.calpool.com',
      yourTopKeywords: 'pool builder dallas - #8\ncustom pool installation - #15\ninground pool cost - #22\npool renovation dallas - #6\nswimming pool contractor - #18\nluxury pool design - #25\npool financing - #30\npool builder near me - #12',
      competitorKeywordData: 'Premier Pools: 12,000 organic keywords, 45K monthly traffic, DA 55. Anthony Sylvan: 8,500 keywords, 32K traffic, DA 48. Riverbend: 3,200 keywords, 8K traffic, DA 35. CalPools: 5,100 keywords, 15K traffic, DA 42.',
      industryVertical: 'Home Services',
      contentInventory: 'Blog posts: 12, Project gallery pages: 50, Service pages: 8, Location pages: 5, FAQ page: 1. No resource guides, no calculators, no video content pages.',
      technicalSEONotes: 'LCP: 3.8s (needs work), CLS: 0.05 (good), INP: 180ms (good). Mobile usability: 3 issues flagged. Index coverage: 85% of submitted URLs indexed.',
      businessGoals: 'Double organic traffic by end of year. Rank top 5 for "pool builder dallas" and related terms. Reduce dependence on Google Ads by building organic lead pipeline.',
      analysisTimeframe: 'Quarterly Deep-Dive',
    },
  },
  'seo-reporting-roi-dashboard-generator': {
    skillId: 'seo-reporting-roi-dashboard-generator',
    defaultTestCaseId: 'pool-builder-seo-report',
    description: 'Monthly SEO report for pool builder client',
    inputPayload: {
      clientOrSiteName: 'Bluewater Custom Pools',
      reportingPeriod: 'Monthly',
      organicTrafficData: 'February 2026: 4,200 sessions (up 18% MoM), 3,800 users, 12,400 pageviews, 45% bounce rate, 2:15 avg session. January: 3,560 sessions. February 2025: 2,800 sessions (YoY: +50%).',
      searchConsoleData: 'Impressions: 85,000 (up 22% MoM). Clicks: 4,100 (up 19%). CTR: 4.8%. Avg position: 18.2 (improved from 21.5). Top queries: "pool builder dallas" (450 clicks, pos 8), "custom pool cost" (280 clicks, pos 12), "inground pool installation" (190 clicks, pos 15).',
      keywordRankingData: 'pool builder dallas | #8 | #11 | +3\ncustom pool cost dallas | #12 | #18 | +6\ninground pool installation | #15 | #15 | 0\npool renovation dallas | #6 | #8 | +2\nluxury pool design | #22 | #28 | +6',
      conversionData: '18 organic form submissions (up from 12 last month, +50%). 8 organic phone calls tracked. Estimated value per lead: $350. Total organic lead value: $9,100.',
      technicalSEOMetrics: 'LCP: 3.2s (improved from 3.8s). CLS: 0.04. INP: 165ms. Crawl errors: 2 (down from 8). Index coverage: 92% (up from 85%). Mobile usability: 1 issue remaining.',
      previousReportHighlights: 'Last month: Published 3 new blog posts targeting "pool cost" keywords. Fixed 6 crawl errors. Submitted 5 new pages to index. Added FAQ schema to 8 pages.',
      audienceType: 'Client (Agency)',
    },
  },
  'site-architecture-internal-linking-optimizer': {
    skillId: 'site-architecture-internal-linking-optimizer',
    defaultTestCaseId: 'pool-builder-site-architecture',
    description: 'Site architecture optimization for pool builder website',
    inputPayload: {
      websiteUrl: 'https://www.bluewatercustompools.com',
      currentSiteStructure: 'Current URL patterns:\n/services/pool-installation\n/services/pool-renovation\n/services/hot-tub-installation\n/gallery/ (all 50 projects flat)\n/blog/ (12 posts, no categories)\n/about\n/contact\n/financing',
      contentInventory: 'Product/service pages: 8\nProject gallery pages: 50 (flat, no categories)\nBlog posts: 12 (uncategorized)\nLocation pages: 5\nCore pages: 4 (about, contact, financing, FAQ)\nTotal: ~79 pages',
      topicClusters: 'Pool Installation: custom pools, fiberglass, concrete, infinity edge, natural pools\nPool Renovation: resurfacing, tile replacement, equipment upgrades, deck renovation\nPool Cost & Financing: pool cost guides, financing options, ROI of pool\nPool Maintenance: (no content yet but clients ask about it)',
      crawlData: 'Total URLs: 95 (16 non-indexed). Orphan pages: 8 (old gallery pages). Avg crawl depth: 3.2. Redirect chains: 3. 404 errors: 5. Duplicate titles: 4.',
      currentInternalLinks: 'Avg internal links per page: 3.2. Most linked: homepage (95 internal links). Least linked: 12 gallery pages with 0 internal links (orphans). Blog posts average 1 internal link each.',
      siteType: 'Professional Services',
      migrationContext: 'Content Reorganization',
      keyTargetPages: '/services/pool-installation | pool builder dallas | #8 | 1,200 sessions/mo\n/services/pool-renovation | pool renovation dallas | #6 | 600 sessions/mo\n/gallery | pool designs | #35 | 200 sessions/mo\n/blog/how-much-does-a-pool-cost | pool cost | #22 | 400 sessions/mo',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PPC AGENCY SKILLS DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

export const PPC_AGENCY_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  'ppc-weekly-triage': {
    skillId: 'ppc-weekly-triage',
    defaultTestCaseId: 'ssp-monday-triage',
    description: 'Monday morning triage for SSP pool/spa Google Ads portfolio',
    inputPayload: {
      anomalyAlerts: '[SSP Anomaly Alert] Week of 02/24 — 3 Critical, 5 Warning\n\nCRITICAL:\n• Bluewater Pools Dallas | CPL: +47% ($68 vs $46 baseline)\n• AquaCare Services Houston | Conv Rate: -52% (0.8% vs 1.7% baseline)\n• Sunrise Pools Austin | CPC: +41% ($8.20 vs $5.80 baseline)\n\nWARNING:\n• Crystal Clear Pools DFW | CPL: +28%\n• Paradise Pools San Antonio | Budget Pace: 125% (overpacing)\n• Gulf Coast Spas | CTR: -24%\n• Premier Hot Tubs | Conv Rate: -22%\n• Lone Star Pools | CPC: +25%',
      budgetPacing: '[SSP Budget Pacing] Day 24/28 — 2 Over, 3 Under\nOVER: Paradise Pools SA (125%), Bluewater Dallas (118%)\nUNDER: AquaCare Houston (72%), Gulf Coast Spas (78%), Hill Country Pools (81%)',
      dashboardNotes: 'Manual observations from Looker Studio:\n- 3 accounts showing gradual CPL increase over 3 weeks (not yet at threshold)\n- AquaCare Houston has had zero conversions since Wednesday — possible tracking issue\n- Spring season starting: 5 accounts still on winter budgets',
      clientCalls: 'Tuesday 10am: Bluewater Pools (monthly review)\nWednesday 2pm: Crystal Clear Pools (quarterly strategy)\nThursday 11am: Paradise Pools (budget increase discussion)',
      seasonalContext: 'February — spring ramp starting in March. Need to prepare budget increase recommendations for account managers. Last year CPLs dropped 30% once spring volume kicked in.',
    },
  },
  'ppc-search-terms-negatives': {
    skillId: 'ppc-search-terms-negatives',
    defaultTestCaseId: 'ssp-search-term-review',
    description: 'Biweekly search term review across SSP pool/spa portfolio',
    inputPayload: {
      searchTermsData: 'Bluewater Pools:\npool table dallas | $42 | 18 clicks | 0 conv\nabove ground pool kit | $38 | 15 clicks | 0 conv\npool cleaning jobs dallas | $22 | 9 clicks | 0 conv\ndiy pool installation | $28 | 11 clicks | 0 conv\nday spa near me dallas | $18 | 7 clicks | 0 conv\n\nAquaCare Services:\nhow to fix pool pump | $35 | 14 clicks | 0 conv\npool chemicals walmart | $25 | 10 clicks | 0 conv\nymca pool hours houston | $15 | 6 clicks | 0 conv\n\nCrystal Clear Pools:\npool builder reviews complaints | $30 | 12 clicks | 0 conv\ncheap above ground pools | $20 | 8 clicks | 0 conv\npool permits diy | $18 | 7 clicks | 0 conv',
      accountNames: 'Bluewater Pools, AquaCare Services, Crystal Clear Pools, Paradise Pools, Sunrise Pools, Gulf Coast Spas, Premier Hot Tubs, Lone Star Pools, Hill Country Pools, Bayou Pools, Lakeside Pools, Texas Spa Co',
      dateRange: 'February 10-24, 2026',
      existingNegatives: 'Current MCC negatives: pool table, billiard, inflatable, kiddie, above ground (basic), public pool, ymca, carpool, pool noodle, pool float',
      industryVertical: 'Pool & Spa / Swimming Pool',
      specialNotes: 'Seeing increase in DIY and job-seeker queries as spring approaches. Need to expand master negative list before peak season.',
    },
  },
  'ppc-recommendations-audit': {
    skillId: 'ppc-recommendations-audit',
    defaultTestCaseId: 'ssp-recommendations-triage',
    description: 'Weekly recommendations audit across SSP portfolio',
    inputPayload: {
      recommendationsData: 'CRITICAL (Score 20+):\nBluewater Pools | Fix Campaign Negative Keyword | Score: 25 | Own negative blocking "pool builder near me"\nAquaCare | Call Extension Missing | Score: 20 | No call extension on service campaigns\n\nHIGH (Score 12-19):\nCrystal Clear | Add Responsive Search Ad | Score: 16 | Ad group with only 1 RSA\nParadise Pools | Remove Redundant Keywords | Score: 15 | 8 duplicate keywords\nSunrise Pools | Sitelink Extension | Score: 14 | Only 2 sitelinks (need 4)\n\nMEDIUM (Score 6-11):\nGulf Coast | Target CPA Opt-In | Score: 9 | Google suggests switching from manual CPC\nLone Star | Use Broad Match | Score: 8 | Suggests converting phrase to broad\nHill Country | Maximize Conversions | Score: 7 | Suggests switching from manual CPC\n\nLOW (Score <6):\n3 accounts | Maximize Clicks | Score: 3 | Google pushing click optimization\n2 accounts | Target ROAS | Score: 2 | Not applicable for lead gen',
      accountContext: 'Portfolio mix: 30 accounts on Target CPA, 12 on Manual CPC, 5 on Maximize Conversions. Most accounts have 30-50 conversions/month. Tracking verified clean across portfolio.',
      autoApplyStatus: 'Auto-apply is OFF across all 47 accounts. Last verified: February 15, 2026.',
      recentChanges: 'Running weekly Monday audit. No major strategy changes this period. Spring season approaching — some accounts will need budget increases.',
      portfolioSize: '47 accounts, $180K monthly spend, pool/spa vertical',
    },
  },
  'ppc-deliverables-generator': {
    skillId: 'ppc-deliverables-generator',
    defaultTestCaseId: 'ssp-client-report-narrative',
    description: 'Client reporting narrative for Bluewater Pools monthly call',
    inputPayload: {
      deliverableType: 'Reporting Draft Queue',
      accountName: 'Bluewater Custom Pools',
      performanceData: 'February 2026: 28 leads, $72 CPL, $2,016 spend, 6.9% CTR, 1.2% conv rate.\nJanuary 2026: 35 leads, $65 CPL, $2,275 spend, 7.3% CTR, 1.5% conv rate.\nFebruary 2025: 22 leads, $81 CPL.\nMoM: Leads -20%, CPL +11%, Spend -11%.\nYoY: Leads +27%, CPL -11%.',
      changesActions: 'Added 45 negative keywords from search term review (est. $280/mo waste eliminated). Paused 2 underperforming RSAs. Added new callout extensions. Submitted 4 new PMax images. Increased PMax daily budget from $50 to $60.',
      clientContext: 'Client mentioned last call that 3 of 10 recent leads were "tire kickers" asking about above-ground pools (not their service). Spring season starting — expect lead volume to increase 2-3x. Client wants to discuss budget increase to $8,000/mo for March-May. Call date: March 5, 2026 at 2:00 PM CT with Account Manager Jennifer.',
      preparedBy: 'Matthew Carlson',
    },
  },
  'ppc-looker-studio-setup': {
    skillId: 'ppc-looker-studio-setup',
    defaultTestCaseId: 'ssp-portfolio-dashboard',
    description: 'Portfolio overview dashboard setup for SSP Google Ads MCC',
    inputPayload: {
      dashboardType: 'Both Dashboards',
      accountCount: '47 accounts',
      currentSetup: 'Google Ads MCC with 47 child accounts. All accounts connected via MCC data source. Google Sheets data source for QS tracking (Script 5 output). No GA4 integration yet (planned). Conversion numbers in Looker Studio don\'t match Google Ads UI for 3 accounts — suspect timezone mismatch. One account shows N/A for all metrics (possible data source filter issue).',
      specificNeeds: 'Need conditional formatting: CPL >125% baseline = red, 100-125% = yellow, <100% = green. Portfolio dashboard used for Monday triage. Client reports exported as PDF for calls. Need portfolio-level metrics (total spend, leads, avg CPL, pacing %, accounts at risk) and account-level metrics (MTD spend, budget, pace %, conversions, CPL, conv rate, CTR, WoW change).',
      clientName: 'Bluewater Custom Pools (template client)',
    },
  },
  'ppc-pmax-hygiene-auditor': {
    skillId: 'ppc-pmax-hygiene-auditor',
    defaultTestCaseId: 'ssp-pmax-audit-bluewater',
    description: 'PMax asset hygiene audit for Bluewater Pools at SSP',
    inputPayload: {
      accountName: 'Bluewater Custom Pools - Dallas',
      pmaxCampaigns: 'PMax Campaign "Pool & Spa Lead Gen" with 3 asset groups:\nAG1 Pool Installation: $40/day budget, 28 conversions, $62 CPA. Audience: In-market Pool & Spa, Custom Home Construction, Homeowners 35-65, HHI $100K+.\nAG2 Pool Renovation: $12/day budget, 8 conversions, $85 CPA. Audience: In-market Home Renovation, existing pool owners.\nAG3 Hot Tub: $8/day budget, 2 conversions, $110 CPA. Audience: In-market Hot Tub, backyard renovation. Launched 2 weeks ago.',
      assetPerformance: 'AG1 Pool Installation: 8 headlines (3 Best, 2 Good, 3 Low), 4 descriptions (2 Good, 2 Low), 12 images (8 Good, 2 Low - stock photos, 2 Learning), 1 video (Good).\nAG2 Pool Renovation: 6 headlines (1 Best, 2 Good, 3 Learning), 3 descriptions (1 Good, 2 Learning), 8 images (5 Good, 3 Learning).\nAG3 Hot Tub: 5 headlines (all Learning), 2 descriptions (all Learning), 5 images (3 Learning, 2 Low).',
      searchCampaignData: 'Since PMax launch 6 weeks ago: Brand Search impression share dropped 92% to 78%. Non-brand Search CPL up 15% ($58 to $67). PMax absorbing estimated 20% of brand queries at $8+ CPC vs $0.50 brand CPC on Search.',
      guardrailStatus: 'Brand exclusions: Client brand name added, misspellings NOT added. URL exclusions: /about, /team, /careers, /blog, /thank-you excluded. NOT excluded: /gallery, /contact (possible circular conversion). Placement exclusions: Parked domains excluded, mobile apps NOT excluded. Conversion actions: Form submission (primary), Phone call 60s+ (primary). Page views and scroll depth NOT excluded from conversion goals.',
      auditType: 'Monthly Full Audit',
    },
  },
  'ppc-ads-scripts-manager': {
    skillId: 'ppc-ads-scripts-manager',
    defaultTestCaseId: 'ssp-script-setup',
    description: 'Setting up all 6 automation scripts for SSP MCC',
    inputPayload: {
      scriptAction: 'Set Up New Script',
      scriptName: 'All Scripts (Full Setup)',
      currentStatus: 'No scripts currently installed. MCC has 47 accounts. Need to set up all 6 scripts: Anomaly Detector (Monday 6 AM), Budget Pacing (Daily 8 AM), Search Term Scanner (biweekly Monday 7 AM), Conv Tracking Health (Wednesday 7 AM), QS Tracker (Friday 5 PM), Ad Auditor (1st of month 7 AM). Fresh setup — need configuration guidance for all CONFIG variables. Google Sheet needs to be created for QS Tracker (Script 5).',
      configDetails: 'Email: matthew@smallscreenproducer.com. Timezone: CST. Min spend thresholds: filter out accounts with <$100/month spend. Will customize thresholds after first month of data. Need Google Sheet ID for Script 5 QS Tracker.',
      mccSize: '47 child accounts',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All skill default test data combined
 */
export const ALL_SKILL_DEFAULT_TEST_DATA: Record<string, SkillDefaultTestData> = {
  ...JOB_SEEKER_DEFAULT_TEST_DATA,
  ...ENTERPRISE_DEFAULT_TEST_DATA,
  ...EXCEL_DEFAULT_TEST_DATA,
  ...GOVERNANCE_DEFAULT_TEST_DATA,
  ...OPERATIONS_DEFAULT_TEST_DATA,
  ...AI_SOLUTIONS_ARCHITECT_DEFAULT_TEST_DATA,
  ...ROLE_TEMPLATE_DEFAULT_TEST_DATA,
  ...WAVE_SKILLS_DEFAULT_TEST_DATA,
  ...PROMPT_ENGINEERING_DEFAULT_TEST_DATA,
  ...ACCOUNTING_DEFAULT_TEST_DATA,
  ...STAFFING_DEFAULT_TEST_DATA,
  ...GOOGLE_ADS_DEFAULT_TEST_DATA,
  ...SEO_DEFAULT_TEST_DATA,
  ...PPC_AGENCY_DEFAULT_TEST_DATA,
};

/**
 * All workflow default test data combined
 */
export const ALL_WORKFLOW_DEFAULT_TEST_DATA: Record<string, WorkflowDefaultTestData> = {
  ...WORKFLOW_DEFAULT_TEST_DATA,
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get default test data for a skill
 */
export function getSkillDefaultTestData(skillId: string): SkillDefaultTestData | undefined {
  return ALL_SKILL_DEFAULT_TEST_DATA[skillId];
}

/**
 * Get default test data for a workflow
 */
export function getWorkflowDefaultTestData(workflowId: string): WorkflowDefaultTestData | undefined {
  return ALL_WORKFLOW_DEFAULT_TEST_DATA[workflowId];
}

/**
 * Check if a skill has default test data
 */
export function hasSkillDefaultTestData(skillId: string): boolean {
  return skillId in ALL_SKILL_DEFAULT_TEST_DATA;
}

/**
 * Check if a workflow has default test data
 */
export function hasWorkflowDefaultTestData(workflowId: string): boolean {
  return workflowId in ALL_WORKFLOW_DEFAULT_TEST_DATA;
}

/**
 * Get all skill IDs that have default test data
 */
export function getSkillsWithDefaultTestData(): string[] {
  return Object.keys(ALL_SKILL_DEFAULT_TEST_DATA);
}

/**
 * Get all workflow IDs that have default test data
 */
export function getWorkflowsWithDefaultTestData(): string[] {
  return Object.keys(ALL_WORKFLOW_DEFAULT_TEST_DATA);
}

/**
 * Convert default test data to a TestCase for the testing framework
 */
export function defaultTestDataToTestCase(data: SkillDefaultTestData): TestCase {
  return {
    id: data.defaultTestCaseId,
    type: 'happy-path',
    description: data.description,
    inputPayload: data.inputPayload,
    rubric: {
      criteria: [
        { id: 'completeness', description: 'Output addresses all key aspects of the input', weight: 30 },
        { id: 'accuracy', description: 'Information is accurate and relevant', weight: 25 },
        { id: 'actionability', description: 'Output provides actionable recommendations', weight: 25 },
        { id: 'formatting', description: 'Output is well-structured and easy to read', weight: 20 },
      ],
    },
  };
}

/**
 * Create a full test suite from default test data for a skill
 */
export function createDefaultTestSuite(skillId: string, skillName: string): SkillTestSuite | undefined {
  const defaultData = getSkillDefaultTestData(skillId);
  if (!defaultData) return undefined;

  return {
    skillId,
    skillName,
    generatedAt: new Date().toISOString(),
    tests: [defaultTestDataToTestCase(defaultData)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM INJECTION HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply default test data to a form state object.
 * Returns a new object with the default values merged in.
 *
 * @param currentFormState - Current form state
 * @param defaultData - Default test data to apply
 * @param skillInputIds - List of valid input IDs for the skill (optional, for validation)
 * @returns New form state with default values applied
 */
export function applyDefaultTestDataToForm(
  currentFormState: Record<string, unknown>,
  defaultData: SkillDefaultTestData | WorkflowDefaultTestData,
  skillInputIds?: string[]
): Record<string, unknown> {
  const newState = { ...currentFormState };

  for (const [key, value] of Object.entries(defaultData.inputPayload)) {
    // If skillInputIds provided, only set known fields
    if (skillInputIds && !skillInputIds.includes(key)) {
      console.warn(`[defaultTestData] Unknown input field: ${key}`);
      continue;
    }

    // Apply the value
    newState[key] = value;
  }

  return newState;
}

/**
 * Get input IDs from a skill or workflow schema
 */
export function extractInputIds(inputs: Array<{ id: string }>): string[] {
  return inputs.map((input) => input.id);
}
