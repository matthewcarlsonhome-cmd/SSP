/**
 * workflows/index.ts - Pre-built Workflow Definitions
 *
 * This file contains the three pre-built workflow templates that chain
 * multiple AI skills together for common job search scenarios.
 *
 * WORKFLOW STRUCTURE:
 * ==================
 * Each workflow defines:
 * - globalInputs: Collected once at the start
 * - steps: Ordered sequence of skills to run
 * - inputMappings: How each step gets its inputs (from global or previous steps)
 *
 * DATA FLOW:
 * ==========
 * Global Inputs → Step 1 → Step 2 → Step 3 → Final Output Package
 *                    ↓         ↓
 *              (output flows to next steps as input)
 */

import type { Workflow } from '../storage/types';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: JOB APPLICATION PACKAGE
// Creates a complete application package: optimized resume + cover letter
// ═══════════════════════════════════════════════════════════════════════════

export const JOB_APPLICATION_WORKFLOW: Workflow = {
  id: 'job-application',
  name: 'Job Application Package',
  description: 'Create a complete, optimized application package in one workflow',
  longDescription: 'This workflow analyzes your fit for a role, customizes your resume, optimizes it for ATS systems, generates a tailored cover letter, and researches the company - all in one automated sequence.',
  icon: 'Briefcase',
  color: 'blue',
  estimatedTime: '8-12 minutes',

  outputs: [
    'Job readiness score with gap analysis',
    'Customized resume tailored to the role',
    'ATS-optimized resume with keyword improvements',
    'Personalized cover letter',
    'Company research insights'
  ],

  globalInputs: [
    {
      id: 'jobTitle',
      label: 'Job Title',
      type: 'text',
      placeholder: 'e.g., Senior Product Manager',
      required: true,
    },
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Google',
      required: true,
    },
    {
      id: 'jobDescription',
      label: 'Job Description',
      type: 'textarea',
      placeholder: 'Paste the full job description here...',
      helpText: 'Include all requirements, responsibilities, and qualifications from the job posting.',
      required: true,
      rows: 10,
      prefillFrom: 'jobDescription',
    },
    {
      id: 'resume',
      label: 'Your Resume',
      type: 'textarea',
      placeholder: 'Paste your current resume here...',
      helpText: 'Your resume will be customized and optimized for this specific role.',
      required: true,
      rows: 12,
      prefillFrom: 'resume',
    },
    {
      id: 'additionalContext',
      label: 'Additional Context (Optional)',
      type: 'textarea',
      placeholder: 'Any specific achievements, projects, or context you want to highlight...',
      required: false,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-readiness',
      skillId: 'job-readiness-score',
      name: 'Assess Job Fit',
      description: 'Analyze your qualifications against the job requirements and identify gaps',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
      },
      outputKey: 'readinessAnalysis',
    },
    {
      id: 'step-customize',
      skillId: 'resume-customizer',
      name: 'Customize Resume',
      description: 'Tailor your resume to highlight relevant experience for this role',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'customizedResume',
    },
    {
      id: 'step-ats',
      skillId: 'ats-optimization-checker',
      name: 'Optimize for ATS',
      description: 'Add missing keywords and optimize formatting for applicant tracking systems',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'previous', stepId: 'step-customize', outputKey: 'customizedResume' },
      },
      outputKey: 'atsOptimizedResume',
    },
    {
      id: 'step-cover-letter',
      skillId: 'cover-letter-generator',
      name: 'Generate Cover Letter',
      description: 'Create a compelling, personalized cover letter',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'previous', stepId: 'step-ats', outputKey: 'atsOptimizedResume' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'coverLetter',
    },
    {
      id: 'step-research',
      skillId: 'company-research',
      name: 'Research Company',
      description: 'Gather insights about the company culture, recent news, and interview tips',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
      },
      outputKey: 'companyResearch',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: INTERVIEW PREPARATION
// Comprehensive prep package for upcoming interviews
// ═══════════════════════════════════════════════════════════════════════════

export const INTERVIEW_PREP_WORKFLOW: Workflow = {
  id: 'interview-prep',
  name: 'Interview Preparation',
  description: 'Comprehensive preparation package for your upcoming interview',
  longDescription: 'Get fully prepared for your interview with company research, likely questions with STAR-format answers, salary insights, and smart questions to ask the interviewer.',
  icon: 'MessageSquare',
  color: 'purple',
  estimatedTime: '10-15 minutes',

  outputs: [
    'Company research and culture insights',
    'Likely interview questions with suggested answers',
    'STAR-format stories for behavioral questions',
    'Salary range and negotiation points',
    'Smart questions to ask the interviewer'
  ],

  globalInputs: [
    {
      id: 'jobTitle',
      label: 'Job Title',
      type: 'text',
      placeholder: 'e.g., Senior Software Engineer',
      required: true,
    },
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Microsoft',
      required: true,
    },
    {
      id: 'jobDescription',
      label: 'Job Description',
      type: 'textarea',
      placeholder: 'Paste the job description here...',
      helpText: 'This helps generate role-specific interview questions.',
      required: true,
      rows: 8,
      prefillFrom: 'jobDescription',
    },
    {
      id: 'resume',
      label: 'Your Resume / Background',
      type: 'textarea',
      placeholder: 'Paste your resume here...',
      helpText: 'Used to prepare personalized STAR stories from your experience.',
      required: true,
      rows: 10,
      prefillFrom: 'resume',
    },
    {
      id: 'interviewType',
      label: 'Interview Type',
      type: 'select',
      options: ['Phone Screen', 'Video Interview', 'On-site', 'Panel Interview', 'Technical Interview', 'Behavioral Interview'],
      required: true,
    },
    {
      id: 'specificConcerns',
      label: 'Specific Concerns (Optional)',
      type: 'textarea',
      placeholder: 'Any areas you want to focus on or concerns about the interview...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-company',
      skillId: 'company-research',
      name: 'Research Company',
      description: 'Deep dive into company culture, values, recent news, and what to expect',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
      },
      outputKey: 'companyResearch',
    },
    {
      id: 'step-interview',
      skillId: 'interview-prep',
      name: 'Generate Interview Questions',
      description: 'Predict likely questions and prepare compelling answers',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
        additionalContext: { type: 'computed', template: 'Interview Type: {{interviewType}}. Concerns: {{specificConcerns}}' },
      },
      outputKey: 'interviewQuestions',
    },
    {
      id: 'step-salary',
      skillId: 'salary-negotiation-master',
      name: 'Research Salary Range',
      description: 'Get salary insights and negotiation talking points',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
      },
      outputKey: 'salaryResearch',
    },
    {
      id: 'step-questions',
      skillId: 'networking-script-generator',
      name: 'Questions to Ask',
      description: 'Generate thoughtful questions that show your interest and insight',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'global', inputId: 'jobDescription' },
        userBackground: { type: 'global', inputId: 'resume' },
        additionalContext: { type: 'computed', template: 'Generate 8-10 thoughtful questions to ask the interviewer based on the company research: {{companyResearch}}' },
      },
      outputKey: 'questionsToAsk',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 3: POST-INTERVIEW FOLLOW-UP
// Everything needed after an interview: thank you notes, self-assessment
// ═══════════════════════════════════════════════════════════════════════════

export const POST_INTERVIEW_WORKFLOW: Workflow = {
  id: 'post-interview',
  name: 'Post-Interview Follow-Up',
  description: 'Complete your interview follow-up with thank you notes and next steps',
  longDescription: 'Send professional thank you notes, assess your interview performance, and plan your follow-up strategy to maximize your chances of landing the offer.',
  icon: 'Mail',
  color: 'green',
  estimatedTime: '5-8 minutes',

  outputs: [
    'Personalized thank you email(s)',
    'Self-assessment of interview performance',
    'Follow-up timeline and strategy',
    'Areas to address in next round (if applicable)'
  ],

  globalInputs: [
    {
      id: 'jobTitle',
      label: 'Job Title',
      type: 'text',
      placeholder: 'e.g., Product Manager',
      required: true,
    },
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Amazon',
      required: true,
    },
    {
      id: 'interviewerNames',
      label: 'Interviewer Name(s)',
      type: 'textarea',
      placeholder: 'e.g., Sarah Johnson (Hiring Manager), Mike Chen (Team Lead)',
      helpText: 'List each interviewer with their role if known. Separate multiple interviewers with commas or new lines.',
      required: true,
      rows: 3,
    },
    {
      id: 'interviewNotes',
      label: 'Interview Notes',
      type: 'textarea',
      placeholder: 'What topics were discussed? What questions were asked? Any specific moments or conversations to reference?',
      helpText: 'Include key discussion points, questions asked, and your responses. The more detail, the better your thank you note.',
      required: true,
      rows: 8,
    },
    {
      id: 'interviewDate',
      label: 'Interview Date',
      type: 'text',
      placeholder: 'e.g., Today, Yesterday, December 3rd',
      required: true,
    },
    {
      id: 'whatWentWell',
      label: 'What Went Well',
      type: 'textarea',
      placeholder: 'Moments where you felt confident, good connections made, strong answers...',
      required: false,
      rows: 3,
    },
    {
      id: 'concerns',
      label: 'Concerns or Areas to Address',
      type: 'textarea',
      placeholder: 'Questions you struggled with, topics you wish you had elaborated on...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-thankyou',
      skillId: 'thank-you-note-generator',
      name: 'Generate Thank You Notes',
      description: 'Create personalized thank you emails for each interviewer',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'computed', template: 'Interviewers: {{interviewerNames}}. Interview Date: {{interviewDate}}' },
        userBackground: { type: 'global', inputId: 'interviewNotes' },
        additionalContext: { type: 'computed', template: 'Topics discussed: {{interviewNotes}}. What went well: {{whatWentWell}}' },
      },
      outputKey: 'thankYouNotes',
    },
    {
      id: 'step-assessment',
      skillId: 'skills-gap-analyzer',
      name: 'Self-Assessment',
      description: 'Analyze your interview performance and identify improvement areas',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'computed', template: 'Interview self-assessment for {{jobTitle}} at {{companyName}}' },
        userBackground: { type: 'computed', template: 'Interview Notes: {{interviewNotes}}\n\nWhat Went Well: {{whatWentWell}}\n\nConcerns: {{concerns}}' },
      },
      outputKey: 'selfAssessment',
    },
    {
      id: 'step-followup',
      skillId: 'onboarding-accelerator-pro',
      name: 'Follow-Up Strategy',
      description: 'Create a follow-up timeline and next steps plan',
      inputMappings: {
        jobTitle: { type: 'global', inputId: 'jobTitle' },
        companyName: { type: 'global', inputId: 'companyName' },
        jobDescription: { type: 'computed', template: 'Create a post-interview follow-up strategy for {{jobTitle}} at {{companyName}}. Interview date: {{interviewDate}}. Include: 1) Timeline for follow-up emails, 2) What to do if no response, 3) How to prepare for next round, 4) How to address any concerns from the interview.' },
        userBackground: { type: 'computed', template: 'Interview Summary:\n{{interviewNotes}}\n\nInterviewers: {{interviewerNames}}\n\nConcerns to address: {{concerns}}' },
      },
      outputKey: 'followUpStrategy',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 4: TRAINING WORKSHOP SETUP
// Complete workshop preparation from needs assessment to marketing
// ═══════════════════════════════════════════════════════════════════════════

export const TRAINING_WORKSHOP_WORKFLOW: Workflow = {
  id: 'training-workshop',
  name: 'Training Workshop Setup',
  description: 'Create a complete workshop package from curriculum to marketing',
  longDescription: 'This workflow guides you through creating a professional training workshop. It starts with needs assessment, designs the curriculum, builds the presentation, creates interactive exercises, polishes all content, and generates marketing materials.',
  icon: 'GraduationCap',
  color: 'amber',
  estimatedTime: '15-20 minutes',

  outputs: [
    'Training needs assessment report',
    'Complete workshop curriculum',
    'Presentation framework and slides outline',
    'Interactive exercises and activities',
    'Polished, professional content',
    'Marketing and promotional materials'
  ],

  globalInputs: [
    {
      id: 'workshopTopic',
      label: 'Workshop Topic',
      type: 'text',
      placeholder: 'e.g., AI Tools for Productivity, Excel Advanced Functions, Leadership Communication',
      required: true,
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'Who are you training? (e.g., "Marketing professionals with 3-5 years experience, familiar with basic digital tools, looking to improve efficiency")',
      required: true,
      rows: 3,
    },
    {
      id: 'duration',
      label: 'Workshop Duration',
      type: 'select',
      options: ['1 hour webinar', '2 hour workshop', 'Half-day (4 hours)', 'Full-day (8 hours)', '2-day intensive'],
      required: true,
    },
    {
      id: 'deliveryFormat',
      label: 'Delivery Format',
      type: 'select',
      options: ['In-person', 'Virtual/Online', 'Hybrid'],
      required: true,
    },
    {
      id: 'learningObjectives',
      label: 'Key Learning Objectives',
      type: 'textarea',
      placeholder: 'What should participants be able to do after the workshop? List 3-5 specific outcomes...',
      required: true,
      rows: 4,
    },
    {
      id: 'organizationContext',
      label: 'Organization/Client Context (Optional)',
      type: 'textarea',
      placeholder: 'Any specific organizational needs, industry context, or constraints to consider...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-needs',
      skillId: 'trainer-training-needs-assessment-generator',
      name: 'Assess Training Needs',
      description: 'Analyze the audience and learning objectives to create a comprehensive needs assessment',
      inputMappings: {
        trainingTopic: { type: 'global', inputId: 'workshopTopic' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        organizationalContext: { type: 'computed', template: 'Duration: {{duration}}. Format: {{deliveryFormat}}. Learning Objectives: {{learningObjectives}}. Context: {{organizationContext}}' },
        currentSkillLevel: { type: 'static', value: 'Mixed levels - assess during workshop' },
        desiredOutcomes: { type: 'global', inputId: 'learningObjectives' },
      },
      outputKey: 'needsAssessment',
    },
    {
      id: 'step-curriculum',
      skillId: 'trainer-workshop-curriculum-designer',
      name: 'Design Curriculum',
      description: 'Create a detailed curriculum with modules, timing, and learning activities',
      inputMappings: {
        workshopTopic: { type: 'global', inputId: 'workshopTopic' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        duration: { type: 'global', inputId: 'duration' },
        learningObjectives: { type: 'global', inputId: 'learningObjectives' },
        deliveryFormat: { type: 'global', inputId: 'deliveryFormat' },
        additionalRequirements: { type: 'computed', template: 'Based on needs assessment: {{needsAssessment}}' },
      },
      outputKey: 'curriculum',
    },
    {
      id: 'step-presentation',
      skillId: 'trainer-training-presentation-builder',
      name: 'Build Presentation',
      description: 'Create the presentation framework and slide structure',
      inputMappings: {
        presentationTopic: { type: 'global', inputId: 'workshopTopic' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        keyMessages: { type: 'global', inputId: 'learningObjectives' },
        duration: { type: 'global', inputId: 'duration' },
        presentationType: { type: 'static', value: 'Training Workshop' },
        additionalContext: { type: 'computed', template: 'Follow this curriculum structure: {{curriculum}}' },
      },
      outputKey: 'presentation',
    },
    {
      id: 'step-exercises',
      skillId: 'trainer-interactive-exercise-activity-generator',
      name: 'Create Interactive Exercises',
      description: 'Design hands-on activities, discussions, and practice exercises',
      inputMappings: {
        trainingTopic: { type: 'global', inputId: 'workshopTopic' },
        learningObjectives: { type: 'global', inputId: 'learningObjectives' },
        audienceProfile: { type: 'global', inputId: 'targetAudience' },
        sessionDuration: { type: 'global', inputId: 'duration' },
        deliveryFormat: { type: 'global', inputId: 'deliveryFormat' },
        additionalContext: { type: 'computed', template: 'Curriculum modules to support: {{curriculum}}' },
      },
      outputKey: 'exercises',
    },
    {
      id: 'step-polish',
      skillId: 'trainer-training-content-copy-editor',
      name: 'Polish Content',
      description: 'Review and refine all training materials for clarity and professionalism',
      inputMappings: {
        contentToEdit: { type: 'computed', template: '# Workshop Materials to Polish\n\n## Curriculum\n{{curriculum}}\n\n## Presentation Outline\n{{presentation}}\n\n## Exercises & Activities\n{{exercises}}' },
        contentType: { type: 'static', value: 'Training Materials' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        toneAndStyle: { type: 'static', value: 'Professional, engaging, educational' },
        specificFocus: { type: 'static', value: 'Clarity, engagement, actionable instructions' },
      },
      outputKey: 'polishedContent',
    },
    {
      id: 'step-marketing',
      skillId: 'trainer-workshop-event-marketing-promotion',
      name: 'Generate Marketing Materials',
      description: 'Create promotional content to attract participants',
      inputMappings: {
        eventName: { type: 'global', inputId: 'workshopTopic' },
        eventDescription: { type: 'computed', template: 'A {{duration}} {{deliveryFormat}} workshop on {{workshopTopic}}. Learning Objectives: {{learningObjectives}}' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        keyBenefits: { type: 'global', inputId: 'learningObjectives' },
        eventDetails: { type: 'computed', template: 'Duration: {{duration}}, Format: {{deliveryFormat}}' },
        promotionChannels: { type: 'static', value: 'Email, LinkedIn, Website' },
      },
      outputKey: 'marketing',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 5: SEO/GEO CLIENT ONBOARDING
// Complete SEO audit and strategy for new clients
// ═══════════════════════════════════════════════════════════════════════════

export const SEO_CLIENT_ONBOARDING_WORKFLOW: Workflow = {
  id: 'seo-client-onboarding',
  name: 'SEO/GEO Client Onboarding',
  description: 'Complete SEO audit and strategy package for new clients',
  longDescription: 'This workflow creates a comprehensive SEO onboarding package including technical audit, keyword research, AI search optimization analysis, content refresh priorities, competitive analysis, and initial content briefs.',
  icon: 'Search',
  color: 'green',
  estimatedTime: '18-25 minutes',

  outputs: [
    'Technical SEO site audit with prioritized fixes',
    'Keyword research and content strategy',
    'AEO/GEO optimization analysis for AI search',
    'Content refresh prioritization',
    'Competitive SERP analysis',
    'Initial content briefs'
  ],

  globalInputs: [
    {
      id: 'websiteUrl',
      label: 'Client Website URL',
      type: 'text',
      placeholder: 'e.g., https://example.com',
      required: true,
    },
    {
      id: 'businessDescription',
      label: 'Business Description',
      type: 'textarea',
      placeholder: 'Describe the client\'s business, products/services, and unique value proposition...',
      required: true,
      rows: 4,
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'Who are the ideal customers? Demographics, pain points, search behavior...',
      required: true,
      rows: 3,
    },
    {
      id: 'competitors',
      label: 'Main Competitors',
      type: 'textarea',
      placeholder: 'List 3-5 main competitors with their websites...',
      required: true,
      rows: 3,
    },
    {
      id: 'businessGoals',
      label: 'SEO/Business Goals',
      type: 'textarea',
      placeholder: 'What does the client want to achieve? (e.g., increase organic traffic 50%, rank for specific keywords, improve local visibility)',
      required: true,
      rows: 3,
    },
    {
      id: 'currentPerformance',
      label: 'Current Performance (Optional)',
      type: 'textarea',
      placeholder: 'Any known metrics: current traffic, rankings, domain authority, existing issues...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-technical-audit',
      skillId: 'seo-specialist-technical-seo-site-audit',
      name: 'Technical SEO Audit',
      description: 'Comprehensive technical audit of site health, crawlability, and performance',
      inputMappings: {
        websiteUrl: { type: 'global', inputId: 'websiteUrl' },
        crawlData: { type: 'computed', template: 'Business: {{businessDescription}}. Goals: {{businessGoals}}. Current state: {{currentPerformance}}' },
        focusAreas: { type: 'static', value: 'Core Web Vitals, Mobile Usability, Indexation, Site Architecture, Security' },
        priorityLevel: { type: 'static', value: 'Full Audit' },
      },
      outputKey: 'technicalAudit',
    },
    {
      id: 'step-keyword-research',
      skillId: 'seo-specialist-keyword-research-content-strategy',
      name: 'Keyword Research',
      description: 'Identify target keywords and develop content strategy',
      inputMappings: {
        businessDescription: { type: 'global', inputId: 'businessDescription' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        competitors: { type: 'global', inputId: 'competitors' },
        currentKeywords: { type: 'global', inputId: 'currentPerformance' },
        goals: { type: 'global', inputId: 'businessGoals' },
      },
      outputKey: 'keywordResearch',
    },
    {
      id: 'step-aeo-geo',
      skillId: 'seo-specialist-aeo-geo-optimization-analyzer',
      name: 'AEO/GEO Analysis',
      description: 'Analyze readiness for AI search engines and generative search',
      inputMappings: {
        websiteUrl: { type: 'global', inputId: 'websiteUrl' },
        businessDescription: { type: 'global', inputId: 'businessDescription' },
        targetQueries: { type: 'computed', template: 'Based on keyword research: {{keywordResearch}}' },
        contentSamples: { type: 'global', inputId: 'currentPerformance' },
        competitors: { type: 'global', inputId: 'competitors' },
      },
      outputKey: 'aeoGeoAnalysis',
    },
    {
      id: 'step-content-refresh',
      skillId: 'seo-specialist-content-refresh-analyzer',
      name: 'Content Refresh Analysis',
      description: 'Identify existing content that needs updating or optimization',
      inputMappings: {
        websiteUrl: { type: 'global', inputId: 'websiteUrl' },
        contentInventory: { type: 'computed', template: 'Business: {{businessDescription}}. Target keywords from research: {{keywordResearch}}' },
        performanceData: { type: 'global', inputId: 'currentPerformance' },
        goals: { type: 'global', inputId: 'businessGoals' },
        competitors: { type: 'global', inputId: 'competitors' },
      },
      outputKey: 'contentRefresh',
    },
    {
      id: 'step-competitor-serp',
      skillId: 'seo-specialist-competitor-serp-analyzer',
      name: 'Competitive Analysis',
      description: 'Analyze competitor SERP presence and identify opportunities',
      inputMappings: {
        targetKeywords: { type: 'computed', template: 'Priority keywords from research: {{keywordResearch}}' },
        competitors: { type: 'global', inputId: 'competitors' },
        yourWebsite: { type: 'global', inputId: 'websiteUrl' },
        industryContext: { type: 'global', inputId: 'businessDescription' },
        analysisGoals: { type: 'global', inputId: 'businessGoals' },
      },
      outputKey: 'competitorAnalysis',
    },
    {
      id: 'step-content-briefs',
      skillId: 'seo-specialist-seo-content-brief-generator',
      name: 'Create Content Briefs',
      description: 'Generate initial content briefs for priority pages',
      inputMappings: {
        targetKeyword: { type: 'computed', template: 'Top priority keywords from: {{keywordResearch}}' },
        searchIntent: { type: 'computed', template: 'Based on audience: {{targetAudience}} and competitor analysis: {{competitorAnalysis}}' },
        businessContext: { type: 'global', inputId: 'businessDescription' },
        competitorContent: { type: 'computed', template: 'Competitor insights: {{competitorAnalysis}}' },
        contentGoals: { type: 'global', inputId: 'businessGoals' },
      },
      outputKey: 'contentBriefs',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 6: DIGITAL MARKETING CAMPAIGN LAUNCH
// Complete multi-channel marketing campaign setup
// ═══════════════════════════════════════════════════════════════════════════

export const MARKETING_CAMPAIGN_WORKFLOW: Workflow = {
  id: 'marketing-campaign',
  name: 'Digital Marketing Campaign Launch',
  description: 'Create a complete multi-channel marketing campaign',
  longDescription: 'This workflow helps you launch a comprehensive digital marketing campaign. It creates competitive research, content strategy, content calendar, social media content, email sequences, and paid ad campaigns for Google and Meta.',
  icon: 'Rocket',
  color: 'pink',
  estimatedTime: '20-30 minutes',

  outputs: [
    'Competitor and market research analysis',
    'Content strategy brief',
    'Content calendar (90 days)',
    'Social media content package',
    'Email campaign sequences',
    'Google Ads campaign structure',
    'Meta Ads campaign structure'
  ],

  globalInputs: [
    {
      id: 'productService',
      label: 'Product/Service',
      type: 'textarea',
      placeholder: 'Describe your product or service, its key features, and unique value proposition...',
      required: true,
      rows: 4,
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'Describe your ideal customer: demographics, pain points, desires, where they spend time online...',
      required: true,
      rows: 4,
    },
    {
      id: 'campaignGoal',
      label: 'Campaign Goal',
      type: 'select',
      options: ['Brand Awareness', 'Lead Generation', 'Product Launch', 'Sales/Conversions', 'Event Promotion', 'Content Marketing'],
      required: true,
    },
    {
      id: 'budget',
      label: 'Monthly Budget Range',
      type: 'select',
      options: ['Under $1,000', '$1,000-$5,000', '$5,000-$15,000', '$15,000-$50,000', '$50,000+'],
      required: true,
    },
    {
      id: 'brandVoice',
      label: 'Brand Voice',
      type: 'select',
      options: ['Professional & Authoritative', 'Friendly & Conversational', 'Bold & Disruptive', 'Inspirational & Motivational', 'Educational & Informative', 'Playful & Humorous'],
      required: true,
    },
    {
      id: 'competitors',
      label: 'Main Competitors',
      type: 'textarea',
      placeholder: 'List 3-5 main competitors...',
      required: true,
      rows: 2,
    },
    {
      id: 'existingAssets',
      label: 'Existing Assets (Optional)',
      type: 'textarea',
      placeholder: 'Any existing content, landing pages, email lists, social accounts to leverage...',
      required: false,
      rows: 2,
    },
  ],

  steps: [
    {
      id: 'step-competitor-research',
      skillId: 'marketing-specialist-competitor-analysis-market-research',
      name: 'Competitor & Market Research',
      description: 'Analyze competitors and market landscape',
      inputMappings: {
        industry: { type: 'global', inputId: 'productService' },
        competitors: { type: 'global', inputId: 'competitors' },
        targetMarket: { type: 'global', inputId: 'targetAudience' },
        analysisGoals: { type: 'global', inputId: 'campaignGoal' },
        focusAreas: { type: 'static', value: 'Messaging, Positioning, Channel Strategy, Content Themes' },
      },
      outputKey: 'competitorResearch',
    },
    {
      id: 'step-content-strategy',
      skillId: 'content-writer-content-strategy-brief-generator',
      name: 'Content Strategy Brief',
      description: 'Create comprehensive content strategy',
      inputMappings: {
        businessContext: { type: 'global', inputId: 'productService' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        contentGoals: { type: 'global', inputId: 'campaignGoal' },
        brandVoice: { type: 'global', inputId: 'brandVoice' },
        competitorInsights: { type: 'computed', template: 'Competitor research findings: {{competitorResearch}}' },
        existingContent: { type: 'global', inputId: 'existingAssets' },
      },
      outputKey: 'contentStrategy',
    },
    {
      id: 'step-content-calendar',
      skillId: 'marketing-specialist-content-calendar-strategy-planner',
      name: 'Content Calendar',
      description: 'Build 90-day content calendar',
      inputMappings: {
        businessGoals: { type: 'global', inputId: 'campaignGoal' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        contentPillars: { type: 'computed', template: 'Based on content strategy: {{contentStrategy}}' },
        publishingFrequency: { type: 'static', value: '3-5 posts per week across channels' },
        channels: { type: 'static', value: 'Blog, LinkedIn, Instagram, Email, Twitter/X' },
        campaignDuration: { type: 'static', value: '90 days' },
      },
      outputKey: 'contentCalendar',
    },
    {
      id: 'step-social-content',
      skillId: 'marketing-specialist-multi-platform-social-media-content-suite',
      name: 'Social Media Content',
      description: 'Create social media content package',
      inputMappings: {
        platform: { type: 'static', value: 'All Platforms (Cross-Platform Campaign)' },
        contentGoal: { type: 'global', inputId: 'campaignGoal' },
        topic: { type: 'computed', template: 'Product/Service: {{productService}}. Campaign theme from strategy: {{contentStrategy}}' },
        brandVoice: { type: 'global', inputId: 'brandVoice' },
        audience: { type: 'global', inputId: 'targetAudience' },
        cta: { type: 'computed', template: 'Based on campaign goal: {{campaignGoal}}' },
        hashtags: { type: 'static', value: 'true' },
        variations: { type: 'static', value: 'true' },
      },
      outputKey: 'socialContent',
    },
    {
      id: 'step-email-campaign',
      skillId: 'marketing-specialist-email-campaign-automation-suite',
      name: 'Email Campaigns',
      description: 'Create email sequences and automation',
      inputMappings: {
        campaignType: { type: 'global', inputId: 'campaignGoal' },
        audience: { type: 'global', inputId: 'targetAudience' },
        productService: { type: 'global', inputId: 'productService' },
        brandVoice: { type: 'global', inputId: 'brandVoice' },
        campaignGoals: { type: 'computed', template: 'Campaign goal: {{campaignGoal}}. Strategy: {{contentStrategy}}' },
        existingAssets: { type: 'global', inputId: 'existingAssets' },
      },
      outputKey: 'emailCampaign',
    },
    {
      id: 'step-google-ads',
      skillId: 'marketing-specialist-google-ads-campaign-builder',
      name: 'Google Ads Campaign',
      description: 'Build Google Ads campaign structure',
      inputMappings: {
        businessDescription: { type: 'global', inputId: 'productService' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        campaignObjective: { type: 'global', inputId: 'campaignGoal' },
        budget: { type: 'global', inputId: 'budget' },
        competitors: { type: 'global', inputId: 'competitors' },
        landingPage: { type: 'global', inputId: 'existingAssets' },
      },
      outputKey: 'googleAds',
    },
    {
      id: 'step-meta-ads',
      skillId: 'marketing-specialist-meta-ads-campaign-builder',
      name: 'Meta Ads Campaign',
      description: 'Build Meta (Facebook/Instagram) Ads campaign',
      inputMappings: {
        businessDescription: { type: 'global', inputId: 'productService' },
        targetAudience: { type: 'global', inputId: 'targetAudience' },
        campaignObjective: { type: 'global', inputId: 'campaignGoal' },
        budget: { type: 'global', inputId: 'budget' },
        creativeAssets: { type: 'computed', template: 'Social content to use: {{socialContent}}' },
        landingPage: { type: 'global', inputId: 'existingAssets' },
      },
      outputKey: 'metaAds',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 7: CONSULTING ENGAGEMENT KICKOFF
// Complete consulting proposal and engagement package
// ═══════════════════════════════════════════════════════════════════════════

export const CONSULTING_ENGAGEMENT_WORKFLOW: Workflow = {
  id: 'consulting-engagement',
  name: 'Consulting Engagement Kickoff',
  description: 'Create a complete consulting proposal and engagement package',
  longDescription: 'This workflow helps consultants create a comprehensive engagement package including proposal, gap analysis, process optimization recommendations, business case, workshop guide, and strategy presentation deck.',
  icon: 'Briefcase',
  color: 'indigo',
  estimatedTime: '20-25 minutes',

  outputs: [
    'Professional client proposal',
    'Gap analysis and strategic roadmap',
    'Process optimization recommendations',
    'Business case with ROI analysis',
    'Workshop facilitation guide',
    'Strategy consulting deck'
  ],

  globalInputs: [
    {
      id: 'clientName',
      label: 'Client/Organization Name',
      type: 'text',
      placeholder: 'e.g., Acme Corporation',
      required: true,
    },
    {
      id: 'clientBackground',
      label: 'Client Background',
      type: 'textarea',
      placeholder: 'Describe the client: industry, size, current situation, history...',
      required: true,
      rows: 4,
    },
    {
      id: 'problemStatement',
      label: 'Problem Statement / Engagement Scope',
      type: 'textarea',
      placeholder: 'What problem is the client trying to solve? What is the scope of the engagement?',
      required: true,
      rows: 4,
    },
    {
      id: 'currentState',
      label: 'Current State',
      type: 'textarea',
      placeholder: 'Describe the current processes, systems, capabilities, and pain points...',
      required: true,
      rows: 4,
    },
    {
      id: 'desiredOutcome',
      label: 'Desired Outcome / Future State',
      type: 'textarea',
      placeholder: 'What does success look like? What should be different after the engagement?',
      required: true,
      rows: 3,
    },
    {
      id: 'constraints',
      label: 'Constraints & Considerations',
      type: 'textarea',
      placeholder: 'Budget, timeline, resources, organizational factors, change readiness...',
      required: false,
      rows: 3,
    },
    {
      id: 'stakeholders',
      label: 'Key Stakeholders',
      type: 'textarea',
      placeholder: 'Who are the decision makers and key stakeholders involved?',
      required: true,
      rows: 2,
    },
  ],

  steps: [
    {
      id: 'step-proposal',
      skillId: 'consultant-client-proposal-generator',
      name: 'Generate Proposal',
      description: 'Create a professional consulting proposal',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        clientBackground: { type: 'global', inputId: 'clientBackground' },
        projectScope: { type: 'global', inputId: 'problemStatement' },
        objectives: { type: 'global', inputId: 'desiredOutcome' },
        constraints: { type: 'global', inputId: 'constraints' },
        stakeholders: { type: 'global', inputId: 'stakeholders' },
      },
      outputKey: 'proposal',
    },
    {
      id: 'step-gap-analysis',
      skillId: 'business-analyst-gap-analysis-strategic-roadmap',
      name: 'Gap Analysis',
      description: 'Analyze current vs. future state and create strategic roadmap',
      inputMappings: {
        currentState: { type: 'global', inputId: 'currentState' },
        futureState: { type: 'global', inputId: 'desiredOutcome' },
        constraints: { type: 'global', inputId: 'constraints' },
        scope: { type: 'computed', template: 'Client: {{clientName}}. Engagement: {{problemStatement}}' },
      },
      outputKey: 'gapAnalysis',
    },
    {
      id: 'step-process-analysis',
      skillId: 'business-analyst-process-analysis-optimization-report',
      name: 'Process Optimization',
      description: 'Identify process improvement opportunities',
      inputMappings: {
        processName: { type: 'computed', template: 'Core processes at {{clientName}}' },
        processSteps: { type: 'global', inputId: 'currentState' },
        volumeMetrics: { type: 'global', inputId: 'clientBackground' },
        painPoints: { type: 'global', inputId: 'problemStatement' },
        systemsUsed: { type: 'global', inputId: 'currentState' },
        optimizationGoal: { type: 'static', value: 'Improve Customer Satisfaction' },
      },
      outputKey: 'processAnalysis',
    },
    {
      id: 'step-business-case',
      skillId: 'consultant-business-case-roi-analysis',
      name: 'Business Case & ROI',
      description: 'Build quantified business case for recommendations',
      inputMappings: {
        initiative: { type: 'global', inputId: 'problemStatement' },
        currentState: { type: 'computed', template: 'Current state: {{currentState}}. Gap analysis findings: {{gapAnalysis}}' },
        proposedSolution: { type: 'computed', template: 'Process optimization recommendations: {{processAnalysis}}' },
        investmentRequired: { type: 'global', inputId: 'constraints' },
        organizationalContext: { type: 'global', inputId: 'clientBackground' },
      },
      outputKey: 'businessCase',
    },
    {
      id: 'step-workshop-guide',
      skillId: 'consultant-client-workshop-facilitator-guide',
      name: 'Workshop Guide',
      description: 'Create facilitation guide for client kickoff workshop',
      inputMappings: {
        workshopObjective: { type: 'computed', template: 'Kickoff engagement with {{clientName}} to address: {{problemStatement}}' },
        participants: { type: 'global', inputId: 'stakeholders' },
        duration: { type: 'static', value: '4 hours' },
        clientContext: { type: 'global', inputId: 'clientBackground' },
        desiredOutcomes: { type: 'global', inputId: 'desiredOutcome' },
        priorAnalysis: { type: 'computed', template: 'Gap analysis: {{gapAnalysis}}. Business case: {{businessCase}}' },
      },
      outputKey: 'workshopGuide',
    },
    {
      id: 'step-strategy-deck',
      skillId: 'consultant-strategy-consulting-deck-builder',
      name: 'Strategy Deck',
      description: 'Build executive strategy presentation',
      inputMappings: {
        clientName: { type: 'global', inputId: 'clientName' },
        engagementContext: { type: 'global', inputId: 'problemStatement' },
        keyFindings: { type: 'computed', template: 'Gap Analysis: {{gapAnalysis}}\n\nProcess Analysis: {{processAnalysis}}' },
        recommendations: { type: 'computed', template: 'Business case and recommendations: {{businessCase}}' },
        audienceLevel: { type: 'static', value: 'C-Suite / Executive Leadership' },
        presentationGoal: { type: 'global', inputId: 'desiredOutcome' },
      },
      outputKey: 'strategyDeck',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 8: STARTUP INVESTOR PITCH
// Complete investor pitch preparation package for founders
// ═══════════════════════════════════════════════════════════════════════════

export const STARTUP_INVESTOR_PITCH_WORKFLOW: Workflow = {
  id: 'startup-investor-pitch',
  name: 'Startup Investor Pitch',
  description: 'Complete investor pitch preparation with deck, financials, and Q&A prep',
  longDescription: 'This workflow helps founders prepare a comprehensive investor pitch package. It creates market analysis, financial projections, pitch deck structure, due diligence Q&A preparation, and investor outreach materials - everything needed to confidently approach investors.',
  icon: 'TrendingUp',
  color: 'emerald',
  estimatedTime: '25-35 minutes',

  outputs: [
    'Market analysis and competitive intelligence',
    'Financial projections with multiple scenarios',
    'Complete pitch deck structure and content',
    'Investor due diligence Q&A preparation',
    'Investor outreach email templates',
    'Executive summary one-pager'
  ],

  globalInputs: [
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., TechStartup Inc.',
      required: true,
    },
    {
      id: 'businessDescription',
      label: 'Business Description',
      type: 'textarea',
      placeholder: 'What does your company do? What problem are you solving and how? Include your unique value proposition...',
      required: true,
      rows: 5,
    },
    {
      id: 'targetMarket',
      label: 'Target Market',
      type: 'textarea',
      placeholder: 'Who are your customers? Describe your TAM, SAM, SOM and target customer segments...',
      required: true,
      rows: 4,
    },
    {
      id: 'businessModel',
      label: 'Business Model & Revenue',
      type: 'textarea',
      placeholder: 'How do you make money? Pricing, revenue streams, current/projected revenue, unit economics...',
      required: true,
      rows: 4,
    },
    {
      id: 'traction',
      label: 'Traction & Milestones',
      type: 'textarea',
      placeholder: 'Key achievements, metrics (users, revenue, growth rate), major milestones reached...',
      required: true,
      rows: 4,
    },
    {
      id: 'competitors',
      label: 'Competitors',
      type: 'textarea',
      placeholder: 'List main competitors and your differentiation/competitive advantages...',
      required: true,
      rows: 3,
    },
    {
      id: 'fundingAsk',
      label: 'Funding Ask',
      type: 'textarea',
      placeholder: 'How much are you raising? What stage (pre-seed, seed, Series A)? Use of funds?',
      required: true,
      rows: 3,
    },
    {
      id: 'teamBackground',
      label: 'Team Background',
      type: 'textarea',
      placeholder: 'Founder backgrounds, key team members, relevant experience, advisors...',
      required: true,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-market-analysis',
      skillId: 'entrepreneur-market-analysis-competitor-intelligence',
      name: 'Market & Competitor Analysis',
      description: 'Deep dive into market opportunity and competitive landscape',
      inputMappings: {
        businessDescription: { type: 'global', inputId: 'businessDescription' },
        targetMarket: { type: 'global', inputId: 'targetMarket' },
        competitors: { type: 'global', inputId: 'competitors' },
        analysisGoals: { type: 'computed', template: 'Investor pitch preparation for {{companyName}}. Need compelling market size and competitive differentiation data.' },
      },
      outputKey: 'marketAnalysis',
    },
    {
      id: 'step-financials',
      skillId: 'entrepreneur-financial-projections-scenario-modeler',
      name: 'Financial Projections',
      description: 'Create investor-ready financial projections with scenarios',
      inputMappings: {
        businessModel: { type: 'global', inputId: 'businessModel' },
        currentTraction: { type: 'global', inputId: 'traction' },
        fundingAmount: { type: 'global', inputId: 'fundingAsk' },
        marketContext: { type: 'computed', template: 'Market analysis: {{marketAnalysis}}' },
        projectionPeriod: { type: 'static', value: '3-5 year projections' },
      },
      outputKey: 'financials',
    },
    {
      id: 'step-pitch-deck',
      skillId: 'entrepreneur-investor-pitch-deck-builder',
      name: 'Build Pitch Deck',
      description: 'Create compelling pitch deck structure and content',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        businessDescription: { type: 'global', inputId: 'businessDescription' },
        targetMarket: { type: 'computed', template: 'Market analysis: {{marketAnalysis}}' },
        traction: { type: 'global', inputId: 'traction' },
        businessModel: { type: 'computed', template: 'Business model: {{businessModel}}. Financial projections: {{financials}}' },
        fundingAsk: { type: 'global', inputId: 'fundingAsk' },
        team: { type: 'global', inputId: 'teamBackground' },
      },
      outputKey: 'pitchDeck',
    },
    {
      id: 'step-due-diligence',
      skillId: 'entrepreneur-investor-due-diligence-q-a-prep',
      name: 'Due Diligence Q&A Prep',
      description: 'Prepare for tough investor questions and due diligence',
      inputMappings: {
        companyOverview: { type: 'computed', template: 'Company: {{companyName}}. {{businessDescription}}' },
        businessModel: { type: 'global', inputId: 'businessModel' },
        financials: { type: 'computed', template: 'Financial projections: {{financials}}' },
        marketPosition: { type: 'computed', template: 'Market analysis: {{marketAnalysis}}' },
        teamBackground: { type: 'global', inputId: 'teamBackground' },
        traction: { type: 'global', inputId: 'traction' },
        fundingDetails: { type: 'global', inputId: 'fundingAsk' },
      },
      outputKey: 'dueDiligencePrep',
    },
    {
      id: 'step-investor-outreach',
      skillId: 'entrepreneur-investor-outreach-communication-suite',
      name: 'Investor Outreach Materials',
      description: 'Create personalized investor outreach templates',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        elevatorPitch: { type: 'computed', template: 'Key pitch points from deck: {{pitchDeck}}' },
        traction: { type: 'global', inputId: 'traction' },
        fundingAsk: { type: 'global', inputId: 'fundingAsk' },
        targetInvestors: { type: 'static', value: 'Angel investors, Seed-stage VCs, Strategic investors' },
        uniqueHook: { type: 'computed', template: 'Market opportunity: {{marketAnalysis}}' },
      },
      outputKey: 'investorOutreach',
    },
    {
      id: 'step-executive-summary',
      skillId: 'entrepreneur-executive-summary-one-pager-creator',
      name: 'Executive Summary',
      description: 'Create one-page executive summary for investors',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        businessOverview: { type: 'global', inputId: 'businessDescription' },
        marketOpportunity: { type: 'computed', template: 'Market analysis: {{marketAnalysis}}' },
        financialHighlights: { type: 'computed', template: 'Key financials: {{financials}}' },
        traction: { type: 'global', inputId: 'traction' },
        fundingAsk: { type: 'global', inputId: 'fundingAsk' },
        team: { type: 'global', inputId: 'teamBackground' },
      },
      outputKey: 'executiveSummary',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 9: SALES ACCOUNT PURSUIT
// Complete account-based selling package for strategic deals
// ═══════════════════════════════════════════════════════════════════════════

export const SALES_ACCOUNT_PURSUIT_WORKFLOW: Workflow = {
  id: 'sales-account-pursuit',
  name: 'Sales Account Pursuit',
  description: 'Complete strategic account pursuit package for winning big deals',
  longDescription: 'This workflow helps sales professionals pursue strategic accounts systematically. It creates comprehensive account intelligence, discovery call preparation, objection handling playbook, ROI value proposition, and a professional proposal - everything needed to win complex B2B deals.',
  icon: 'Target',
  color: 'orange',
  estimatedTime: '20-30 minutes',

  outputs: [
    'Comprehensive account intelligence brief',
    'Discovery call question framework',
    'Objection handling playbook',
    'ROI and value proposition calculator',
    'Professional sales proposal/RFP response',
    'Follow-up sequence strategy'
  ],

  globalInputs: [
    {
      id: 'targetCompany',
      label: 'Target Company Name',
      type: 'text',
      placeholder: 'e.g., Enterprise Corp',
      required: true,
    },
    {
      id: 'companyContext',
      label: 'Company Background',
      type: 'textarea',
      placeholder: 'What do you know about this company? Industry, size, recent news, known initiatives...',
      required: true,
      rows: 4,
    },
    {
      id: 'yourProduct',
      label: 'Your Product/Solution',
      type: 'textarea',
      placeholder: 'Describe your product/service, key features, and typical value delivered...',
      required: true,
      rows: 4,
    },
    {
      id: 'identifiedNeed',
      label: 'Identified Need/Opportunity',
      type: 'textarea',
      placeholder: 'What pain points or opportunities have you identified? Why might they need your solution?',
      required: true,
      rows: 4,
    },
    {
      id: 'stakeholders',
      label: 'Known Stakeholders',
      type: 'textarea',
      placeholder: 'List known contacts, their roles, and any relationship history...',
      required: true,
      rows: 3,
    },
    {
      id: 'dealSize',
      label: 'Expected Deal Size',
      type: 'select',
      options: ['Under $25K', '$25K-$100K', '$100K-$500K', '$500K-$1M', '$1M+'],
      required: true,
    },
    {
      id: 'salesStage',
      label: 'Current Sales Stage',
      type: 'select',
      options: ['Prospecting/Research', 'Initial Outreach', 'Discovery', 'Solution Presentation', 'Proposal/Negotiation', 'Closing'],
      required: true,
    },
    {
      id: 'competitors',
      label: 'Known Competitors in Deal',
      type: 'textarea',
      placeholder: 'What competitors might they be evaluating? Any incumbent solutions?',
      required: false,
      rows: 2,
    },
  ],

  steps: [
    {
      id: 'step-account-intel',
      skillId: 'sales-representative-target-account-intelligence-research',
      name: 'Account Intelligence',
      description: 'Build comprehensive intelligence brief on the target account',
      inputMappings: {
        targetCompany: { type: 'global', inputId: 'targetCompany' },
        knownContext: { type: 'global', inputId: 'companyContext' },
        yourSolution: { type: 'global', inputId: 'yourProduct' },
        keyStakeholders: { type: 'global', inputId: 'stakeholders' },
        researchGoals: { type: 'computed', template: 'Pursuing {{dealSize}} deal. Stage: {{salesStage}}. Need: {{identifiedNeed}}' },
      },
      outputKey: 'accountIntel',
    },
    {
      id: 'step-discovery-framework',
      skillId: 'sales-representative-discovery-call-preparation',
      name: 'Discovery Call Framework',
      description: 'Create tailored discovery questions based on account intelligence',
      inputMappings: {
        prospect: { type: 'computed', template: 'Account: {{targetCompany}}. Intelligence: {{accountIntel}}' },
        yourSolution: { type: 'global', inputId: 'yourProduct' },
        identifiedPainPoints: { type: 'global', inputId: 'identifiedNeed' },
        stakeholderRoles: { type: 'global', inputId: 'stakeholders' },
        dealContext: { type: 'computed', template: 'Deal size: {{dealSize}}. Stage: {{salesStage}}' },
      },
      outputKey: 'discoveryFramework',
    },
    {
      id: 'step-objection-handling',
      skillId: 'sales-representative-sales-objection-mastery-playbook',
      name: 'Objection Handling Playbook',
      description: 'Prepare responses for likely objections',
      inputMappings: {
        product: { type: 'global', inputId: 'yourProduct' },
        targetAccount: { type: 'computed', template: 'Account: {{targetCompany}}. Intel: {{accountIntel}}' },
        competitors: { type: 'global', inputId: 'competitors' },
        dealSize: { type: 'global', inputId: 'dealSize' },
        knownConcerns: { type: 'global', inputId: 'identifiedNeed' },
      },
      outputKey: 'objectionPlaybook',
    },
    {
      id: 'step-roi-calculator',
      skillId: 'sales-representative-value-proposition-roi-calculator-generator',
      name: 'ROI Value Proposition',
      description: 'Build quantified ROI and value proposition',
      inputMappings: {
        product: { type: 'global', inputId: 'yourProduct' },
        prospect: { type: 'computed', template: 'Account: {{targetCompany}}. Business context: {{accountIntel}}' },
        identifiedNeeds: { type: 'global', inputId: 'identifiedNeed' },
        dealSize: { type: 'global', inputId: 'dealSize' },
        competitiveLandscape: { type: 'global', inputId: 'competitors' },
      },
      outputKey: 'roiCalculator',
    },
    {
      id: 'step-proposal',
      skillId: 'sales-representative-enterprise-sales-proposal-generator',
      name: 'Sales Proposal',
      description: 'Generate professional proposal tailored to the account',
      inputMappings: {
        prospect: { type: 'global', inputId: 'targetCompany' },
        prospectContext: { type: 'computed', template: 'Account intelligence: {{accountIntel}}' },
        yourSolution: { type: 'global', inputId: 'yourProduct' },
        identifiedNeeds: { type: 'global', inputId: 'identifiedNeed' },
        valueProposition: { type: 'computed', template: 'ROI analysis: {{roiCalculator}}' },
        pricingRange: { type: 'global', inputId: 'dealSize' },
        stakeholders: { type: 'global', inputId: 'stakeholders' },
      },
      outputKey: 'proposal',
    },
    {
      id: 'step-followup-strategy',
      skillId: 'sales-representative-deal-strategy-next-steps-planner',
      name: 'Follow-Up Strategy',
      description: 'Create strategic follow-up plan to advance the deal',
      inputMappings: {
        account: { type: 'global', inputId: 'targetCompany' },
        currentStage: { type: 'global', inputId: 'salesStage' },
        stakeholders: { type: 'global', inputId: 'stakeholders' },
        dealContext: { type: 'computed', template: 'Deal size: {{dealSize}}. Account intel: {{accountIntel}}' },
        keyInsights: { type: 'computed', template: 'Discovery insights: {{discoveryFramework}}. Objection prep: {{objectionPlaybook}}' },
        proposalSummary: { type: 'computed', template: 'Proposal highlights: {{proposal}}' },
      },
      outputKey: 'followUpStrategy',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 10: CUSTOMER CHURN PREVENTION
// Proactively identify at-risk accounts and execute retention strategies
// Estimated Annual Impact: $500K - $5M+
// ═══════════════════════════════════════════════════════════════════════════

export const CUSTOMER_CHURN_PREVENTION_WORKFLOW: Workflow = {
  id: 'customer-churn-prevention',
  name: 'Customer Churn Prevention',
  description: 'Proactively identify at-risk accounts and execute retention strategies to protect revenue',
  longDescription: 'This workflow analyzes your customer portfolio for churn risk signals, generates prioritized intervention strategies, creates escalation briefs for critical accounts, and develops win-back campaigns for at-risk customers.',
  icon: 'ShieldAlert',
  color: 'red',
  estimatedTime: '15-25 minutes',

  outputs: [
    'Churn risk analysis with prioritized at-risk accounts',
    'Executive escalation brief for critical accounts',
    'Retention playbook with action plan',
    'Win-back campaign for high-risk customers'
  ],

  globalInputs: [
    {
      id: 'portfolioData',
      label: 'Customer Portfolio Data',
      type: 'textarea',
      placeholder: 'List your accounts with: name, ARR, contract end date, health score, last engagement date, NPS, support tickets, feature adoption %, executive sponsor status...',
      helpText: 'Include all relevant customer health metrics for accurate risk assessment.',
      required: true,
      rows: 8,
    },
    {
      id: 'behaviorChanges',
      label: 'Recent Behavior Changes',
      type: 'textarea',
      placeholder: 'Describe any notable changes: login frequency drops, missed meetings, reduced communication, champion departures, budget discussions, competitive mentions...',
      required: true,
      rows: 5,
    },
    {
      id: 'industryContext',
      label: 'Industry/Market Context',
      type: 'textarea',
      placeholder: 'Industry trends, economic factors, competitive landscape, seasonal patterns affecting your customers...',
      required: false,
      rows: 3,
    },
    {
      id: 'criticalAccount',
      label: 'Most Critical At-Risk Account',
      type: 'textarea',
      placeholder: 'For the account requiring immediate escalation: name, ARR, situation details, stakeholders, actions already taken...',
      helpText: 'This will be used to generate an executive escalation brief.',
      required: true,
      rows: 5,
    },
    {
      id: 'productUpdates',
      label: 'Recent Product/Service Improvements',
      type: 'textarea',
      placeholder: 'New features, pricing changes, service improvements since customers went at-risk - useful for win-back messaging...',
      required: false,
      rows: 3,
    },
  ],

  steps: [
    {
      id: 'step-churn-analysis',
      skillId: 'customer-success-manager-churn-risk-early-warning-system',
      name: 'Analyze Churn Risk',
      description: 'Identify at-risk accounts with predictive signals and prioritize interventions',
      inputMappings: {
        accountList: { type: 'global', inputId: 'portfolioData' },
        behaviorChanges: { type: 'global', inputId: 'behaviorChanges' },
        industryContext: { type: 'global', inputId: 'industryContext' },
        timeframe: { type: 'static', value: 'Next 90 Days' },
      },
      outputKey: 'churnAnalysis',
    },
    {
      id: 'step-escalation-brief',
      skillId: 'customer-success-manager-at-risk-account-escalation-brief',
      name: 'Create Executive Escalation Brief',
      description: 'Generate leadership-ready brief for the most critical account',
      inputMappings: {
        accountDetails: { type: 'global', inputId: 'criticalAccount' },
        riskSituation: { type: 'computed', template: 'Based on portfolio analysis: {{churnAnalysis}}' },
        stakeholderMap: { type: 'global', inputId: 'criticalAccount' },
        attemptedActions: { type: 'global', inputId: 'behaviorChanges' },
        requestedSupport: { type: 'static', value: 'Multiple Resources Needed' },
      },
      outputKey: 'escalationBrief',
    },
    {
      id: 'step-retention-playbook',
      skillId: 'customer-success-manager-renewal-playbook-generator',
      name: 'Generate Retention Playbook',
      description: 'Create comprehensive retention strategy with action plan',
      inputMappings: {
        accountInfo: { type: 'global', inputId: 'criticalAccount' },
        stakeholders: { type: 'computed', template: 'From escalation analysis: {{escalationBrief}}' },
        healthStatus: { type: 'static', value: 'At Risk - Significant Issues' },
        knownConcerns: { type: 'global', inputId: 'behaviorChanges' },
        renewalGoal: { type: 'static', value: 'Downgrade Prevention' },
      },
      outputKey: 'retentionPlaybook',
    },
    {
      id: 'step-winback-campaign',
      skillId: 'customer-success-manager-win-back-campaign-generator',
      name: 'Create Win-Back Campaign',
      description: 'Develop personalized campaign for high-risk accounts',
      inputMappings: {
        customerInfo: { type: 'global', inputId: 'criticalAccount' },
        churnReason: { type: 'global', inputId: 'behaviorChanges' },
        productUpdates: { type: 'global', inputId: 'productUpdates' },
        campaignGoal: { type: 'static', value: 'Full Reactivation (Original Contract)' },
        timeSinceChurn: { type: 'static', value: 'Less than 30 days' },
      },
      outputKey: 'winBackCampaign',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 11: ENTERPRISE ACCOUNT EXPANSION
// Identify and execute expansion opportunities within existing accounts
// Estimated Annual Impact: $200K - $2M+
// ═══════════════════════════════════════════════════════════════════════════

export const ENTERPRISE_ACCOUNT_EXPANSION_WORKFLOW: Workflow = {
  id: 'enterprise-account-expansion',
  name: 'Enterprise Account Expansion',
  description: 'Identify and prioritize expansion opportunities within your customer base',
  longDescription: 'This workflow performs comprehensive whitespace analysis across your accounts, scores and prioritizes expansion opportunities, generates customer health assessments to validate readiness, and creates executive QBR materials to position expansion conversations.',
  icon: 'TrendingUp',
  color: 'emerald',
  estimatedTime: '15-20 minutes',

  outputs: [
    'Account whitespace analysis with expansion opportunities',
    'Prioritized expansion opportunity scorecard',
    'Customer health assessment for expansion readiness',
    'Executive QBR deck positioning expansion'
  ],

  globalInputs: [
    {
      id: 'accountProfile',
      label: 'Target Account Profile',
      type: 'textarea',
      placeholder: 'Company overview: size, industry, revenue, locations, business units, org structure, strategic initiatives, growth plans, digital transformation efforts...',
      helpText: 'The more context you provide, the better the whitespace analysis.',
      required: true,
      rows: 6,
    },
    {
      id: 'currentFootprint',
      label: 'Current Product Footprint',
      type: 'textarea',
      placeholder: 'Products owned, user count by department, features adopted, integration points, current ARR by product, contract dates...',
      required: true,
      rows: 5,
    },
    {
      id: 'productPortfolio',
      label: 'Your Full Product Portfolio',
      type: 'textarea',
      placeholder: 'All products/services available: names, key use cases, typical buyers, pricing tiers, complementary products, cross-sell synergies...',
      required: true,
      rows: 5,
    },
    {
      id: 'expansionOpportunities',
      label: 'Known/Suspected Opportunities',
      type: 'textarea',
      placeholder: 'Any expansion conversations, expressed interests, pain points mentioned, upcoming initiatives, new departments, geographic expansion, M&A activity...',
      required: false,
      rows: 4,
    },
    {
      id: 'customerUsageData',
      label: 'Customer Usage & Engagement Data',
      type: 'textarea',
      placeholder: 'Login frequency, feature adoption %, support tickets, NPS/CSAT, product usage metrics, key stakeholder engagement levels...',
      required: true,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-whitespace-analysis',
      skillId: 'customer-success-manager-account-whitespace-analyzer',
      name: 'Analyze Account Whitespace',
      description: 'Map current footprint against expansion potential',
      inputMappings: {
        accountProfile: { type: 'global', inputId: 'accountProfile' },
        currentState: { type: 'global', inputId: 'currentFootprint' },
        productPortfolio: { type: 'global', inputId: 'productPortfolio' },
        knownOpportunities: { type: 'global', inputId: 'expansionOpportunities' },
        competitorPresence: { type: 'static', value: 'Unknown - analyze based on gaps' },
      },
      outputKey: 'whitespaceAnalysis',
    },
    {
      id: 'step-opportunity-scoring',
      skillId: 'customer-success-manager-expansion-opportunity-scorer',
      name: 'Score & Prioritize Opportunities',
      description: 'Rank expansion opportunities by potential and probability',
      inputMappings: {
        opportunities: { type: 'computed', template: 'Whitespace opportunities identified: {{whitespaceAnalysis}}' },
        scoringPriorities: { type: 'static', value: 'Balanced (Default)' },
        resourceConstraints: { type: 'static', value: 'Standard sales team capacity' },
        timeHorizon: { type: 'static', value: 'Next 2 Quarters' },
      },
      outputKey: 'opportunityScorecard',
    },
    {
      id: 'step-health-assessment',
      skillId: 'customer-success-manager-customer-health-score-analyzer',
      name: 'Assess Expansion Readiness',
      description: 'Evaluate customer health and expansion signals',
      inputMappings: {
        customerData: { type: 'global', inputId: 'customerUsageData' },
        accountInfo: { type: 'global', inputId: 'currentFootprint' },
        recentActivity: { type: 'global', inputId: 'expansionOpportunities' },
        industryBenchmarks: { type: 'static', value: 'SaaS / Technology' },
      },
      outputKey: 'healthAssessment',
    },
    {
      id: 'step-qbr-deck',
      skillId: 'customer-success-manager-executive-qbr-deck-generator',
      name: 'Create QBR Expansion Deck',
      description: 'Generate executive materials positioning expansion',
      inputMappings: {
        accountInfo: { type: 'global', inputId: 'accountProfile' },
        performanceData: { type: 'global', inputId: 'customerUsageData' },
        healthScore: { type: 'computed', template: 'Health assessment: {{healthAssessment}}' },
        expansionOpportunities: { type: 'computed', template: 'Top opportunities: {{opportunityScorecard}}' },
        qbrFocus: { type: 'static', value: 'Expansion Positioning' },
      },
      outputKey: 'qbrDeck',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 12: RFP RESPONSE CENTER
// Efficiently analyze RFPs and generate winning proposals
// Estimated Annual Impact: $500K - $10M+
// ═══════════════════════════════════════════════════════════════════════════

export const RFP_RESPONSE_CENTER_WORKFLOW: Workflow = {
  id: 'rfp-response-center',
  name: 'RFP Response Center',
  description: 'Analyze RFPs and generate winning proposals with compliance matrices and executive summaries',
  longDescription: 'This workflow analyzes RFP requirements, generates comprehensive compliance matrices, creates compelling response sections, and produces executive summaries designed to win evaluator attention.',
  icon: 'FileCheck',
  color: 'indigo',
  estimatedTime: '20-30 minutes',

  outputs: [
    'RFP requirements analysis with go/no-go recommendation',
    'Comprehensive compliance matrix',
    'Written proposal section with win themes',
    'Executive summary for proposal'
  ],

  globalInputs: [
    {
      id: 'rfpContent',
      label: 'RFP Document Content',
      type: 'textarea',
      placeholder: 'Paste the full RFP or key sections including: requirements, evaluation criteria, submission guidelines, scope of work, mandatory qualifications...',
      helpText: 'Include as much detail as possible for accurate analysis.',
      required: true,
      rows: 12,
    },
    {
      id: 'companyCapabilities',
      label: 'Your Company Capabilities',
      type: 'textarea',
      placeholder: 'Products/services, certifications, past performance, team capabilities, geographic coverage, technology stack, differentiators...',
      required: true,
      rows: 6,
    },
    {
      id: 'winThemes',
      label: 'Win Themes & Differentiators',
      type: 'textarea',
      placeholder: 'Your 3-5 key themes that differentiate you from competitors. What makes you the best choice for this opportunity?',
      required: true,
      rows: 4,
    },
    {
      id: 'pastPerformance',
      label: 'Relevant Past Performance',
      type: 'textarea',
      placeholder: 'Similar projects completed, client references, metrics achieved, case studies, team credentials...',
      required: true,
      rows: 4,
    },
    {
      id: 'solutionApproach',
      label: 'Your Proposed Solution/Approach',
      type: 'textarea',
      placeholder: 'High-level description of how you would approach this opportunity, methodology, team structure, timeline...',
      required: true,
      rows: 5,
    },
  ],

  steps: [
    {
      id: 'step-rfp-analysis',
      skillId: 'business-analyst-rfp-requirements-analyzer',
      name: 'Analyze RFP Requirements',
      description: 'Parse requirements, assess compliance, and recommend go/no-go',
      inputMappings: {
        rfpContent: { type: 'global', inputId: 'rfpContent' },
        companyCapabilities: { type: 'global', inputId: 'companyCapabilities' },
        competitivePosition: { type: 'global', inputId: 'winThemes' },
        resourceAvailability: { type: 'static', value: 'Full Team Available' },
      },
      outputKey: 'rfpAnalysis',
    },
    {
      id: 'step-compliance-matrix',
      skillId: 'business-analyst-rfp-compliance-matrix-generator',
      name: 'Generate Compliance Matrix',
      description: 'Map all requirements to response sections and evidence',
      inputMappings: {
        requirements: { type: 'computed', template: 'Requirements from analysis: {{rfpAnalysis}}' },
        proposalOutline: { type: 'global', inputId: 'solutionApproach' },
        capabilityEvidence: { type: 'global', inputId: 'pastPerformance' },
        matrixFormat: { type: 'static', value: 'Detailed (Full Traceability)' },
      },
      outputKey: 'complianceMatrix',
    },
    {
      id: 'step-response-section',
      skillId: 'business-analyst-rfp-section-response-writer',
      name: 'Write Technical Response',
      description: 'Create compelling proposal section with win themes',
      inputMappings: {
        requirements: { type: 'global', inputId: 'rfpContent' },
        solutionContent: { type: 'global', inputId: 'solutionApproach' },
        winThemes: { type: 'global', inputId: 'winThemes' },
        evidence: { type: 'global', inputId: 'pastPerformance' },
        sectionType: { type: 'static', value: 'Technical Approach' },
        constraints: { type: 'static', value: 'Standard federal proposal formatting' },
      },
      outputKey: 'technicalResponse',
    },
    {
      id: 'step-executive-summary',
      skillId: 'business-analyst-proposal-executive-summary-generator',
      name: 'Generate Executive Summary',
      description: 'Create compelling executive summary to win evaluators',
      inputMappings: {
        opportunityOverview: { type: 'computed', template: 'RFP analysis summary: {{rfpAnalysis}}' },
        winThemes: { type: 'global', inputId: 'winThemes' },
        solutionHighlights: { type: 'global', inputId: 'solutionApproach' },
        proofPoints: { type: 'global', inputId: 'pastPerformance' },
        customerKnowledge: { type: 'global', inputId: 'rfpContent' },
        pageLimit: { type: 'static', value: '2 Pages' },
      },
      outputKey: 'executiveSummary',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 13: REVENUE OPERATIONS OPTIMIZATION
// Analyze and optimize revenue operations for pipeline health and forecast accuracy
// Estimated Annual Impact: $300K - $3M+
// ═══════════════════════════════════════════════════════════════════════════

export const REVOPS_OPTIMIZATION_WORKFLOW: Workflow = {
  id: 'revops-optimization',
  name: 'Revenue Operations Optimization',
  description: 'Analyze pipeline health, optimize forecasts, and identify process bottlenecks',
  longDescription: 'This workflow performs comprehensive pipeline health analysis, generates accurate sales forecasts with multiple scenarios, identifies revenue process bottlenecks, and produces win/loss analysis to improve performance.',
  icon: 'LineChart',
  color: 'blue',
  estimatedTime: '20-25 minutes',

  outputs: [
    'Pipeline health analysis with metrics and recommendations',
    'Sales forecast with scenario analysis',
    'Win/loss analysis with actionable insights',
    'Process bottleneck analysis with optimization roadmap'
  ],

  globalInputs: [
    {
      id: 'pipelineData',
      label: 'Pipeline Data',
      type: 'textarea',
      placeholder: 'Deals by stage, deal values, days in stage, close dates, win rates by segment, historical trends, quota targets, sales cycle length...',
      helpText: 'Export from your CRM or provide summary metrics.',
      required: true,
      rows: 8,
    },
    {
      id: 'historicalPerformance',
      label: 'Historical Performance',
      type: 'textarea',
      placeholder: 'Win rates by stage, average deal sizes, slip rates, seasonal patterns, quota attainment history, year-over-year trends...',
      required: true,
      rows: 5,
    },
    {
      id: 'teamInfo',
      label: 'Team Structure & Quotas',
      type: 'textarea',
      placeholder: 'Number of reps, territories, quotas per rep, capacity, workload distribution, hiring plans...',
      required: true,
      rows: 4,
    },
    {
      id: 'winLossData',
      label: 'Recent Win/Loss Data',
      type: 'textarea',
      placeholder: 'List recent deals (won/lost) with: outcome, deal size, sales cycle, competitor, industry, loss reason or win factors, stakeholders engaged...',
      required: true,
      rows: 6,
    },
    {
      id: 'processDescription',
      label: 'Current Revenue Processes',
      type: 'textarea',
      placeholder: 'Lead routing, opportunity stages, handoffs, approvals, quote-to-cash flow, tools/systems used, known pain points...',
      required: true,
      rows: 5,
    },
  ],

  steps: [
    {
      id: 'step-pipeline-health',
      skillId: 'financial-analyst-pipeline-health-analyzer',
      name: 'Analyze Pipeline Health',
      description: 'Assess pipeline metrics, identify bottlenecks and at-risk deals',
      inputMappings: {
        pipelineData: { type: 'global', inputId: 'pipelineData' },
        teamStructure: { type: 'global', inputId: 'teamInfo' },
        salesProcess: { type: 'global', inputId: 'processDescription' },
        analysisTimeframe: { type: 'static', value: 'Current Quarter' },
      },
      outputKey: 'pipelineHealth',
    },
    {
      id: 'step-forecast',
      skillId: 'financial-analyst-sales-forecast-optimizer',
      name: 'Generate Sales Forecast',
      description: 'Create accurate forecast with multiple scenarios',
      inputMappings: {
        currentPipeline: { type: 'global', inputId: 'pipelineData' },
        historicalData: { type: 'global', inputId: 'historicalPerformance' },
        targets: { type: 'global', inputId: 'teamInfo' },
        forecastPeriod: { type: 'static', value: 'This Quarter' },
        forecastType: { type: 'static', value: 'Hybrid (Combined Approach)' },
      },
      outputKey: 'salesForecast',
    },
    {
      id: 'step-winloss-analysis',
      skillId: 'financial-analyst-win-loss-analysis-generator',
      name: 'Analyze Win/Loss Patterns',
      description: 'Identify winning patterns and improvement areas',
      inputMappings: {
        dealData: { type: 'global', inputId: 'winLossData' },
        analysisScope: { type: 'static', value: 'Last Quarter' },
        competitorInfo: { type: 'static', value: 'Analyze based on deal data' },
        salesProcess: { type: 'global', inputId: 'processDescription' },
      },
      outputKey: 'winLossAnalysis',
    },
    {
      id: 'step-bottleneck-analysis',
      skillId: 'financial-analyst-revenue-process-bottleneck-finder',
      name: 'Find Process Bottlenecks',
      description: 'Identify inefficiencies and optimization opportunities',
      inputMappings: {
        processDescription: { type: 'global', inputId: 'processDescription' },
        painPoints: { type: 'computed', template: 'Issues from pipeline analysis: {{pipelineHealth}}. Win/loss insights: {{winLossAnalysis}}' },
        systems: { type: 'global', inputId: 'processDescription' },
        teamMetrics: { type: 'global', inputId: 'historicalPerformance' },
        priority: { type: 'static', value: 'All Areas' },
      },
      outputKey: 'bottleneckAnalysis',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 14: TECHNICAL DEBT ASSESSMENT
// Comprehensive technical debt analysis with business case and remediation plan
// Estimated Annual Impact: $100K - $500K
// ═══════════════════════════════════════════════════════════════════════════

export const TECH_DEBT_ASSESSMENT_WORKFLOW: Workflow = {
  id: 'tech-debt-assessment',
  name: 'Technical Debt Assessment',
  description: 'Identify, prioritize, and build business cases for technical debt remediation',
  longDescription: 'This workflow scans your codebase for technical debt, prioritizes remediation efforts based on business impact, generates executive-friendly briefs for stakeholder buy-in, and creates detailed remediation roadmaps.',
  icon: 'Bug',
  color: 'orange',
  estimatedTime: '15-20 minutes',

  outputs: [
    'Technical debt inventory with severity ratings',
    'Prioritized remediation backlog',
    'Executive stakeholder brief with ROI',
    'Detailed remediation roadmap'
  ],

  globalInputs: [
    {
      id: 'codebaseInfo',
      label: 'Codebase Information',
      type: 'textarea',
      placeholder: 'Repository details: languages, frameworks, size (LOC), age, contributors, test coverage %, build frequency, CI/CD maturity, known pain points...',
      helpText: 'Include technical details that help assess debt scope.',
      required: true,
      rows: 6,
    },
    {
      id: 'architectureContext',
      label: 'Architecture Context',
      type: 'textarea',
      placeholder: 'System architecture: monolith vs microservices, databases, integrations, deployment infrastructure, scaling requirements, cloud platform...',
      required: true,
      rows: 5,
    },
    {
      id: 'knownIssues',
      label: 'Known Technical Issues',
      type: 'textarea',
      placeholder: 'Legacy code areas, deprecated dependencies, performance bottlenecks, security concerns, hard-to-maintain modules, duplicated code, test gaps...',
      required: true,
      rows: 6,
    },
    {
      id: 'businessContext',
      label: 'Business Context',
      type: 'textarea',
      placeholder: 'Product roadmap priorities, team capacity (developers available), budget constraints, regulatory requirements, planned migrations/upgrades...',
      required: true,
      rows: 4,
    },
    {
      id: 'stakeholderAudience',
      label: 'Primary Stakeholder Audience',
      type: 'select',
      options: ['C-Suite / Board', 'VP/Director Level', 'Product Management', 'Engineering Leadership', 'Mixed Technical/Non-Technical'],
      required: true,
    },
  ],

  steps: [
    {
      id: 'step-debt-scan',
      skillId: 'software-engineer-technical-debt-scanner',
      name: 'Scan Technical Debt',
      description: 'Identify and categorize all technical debt with impact analysis',
      inputMappings: {
        codebaseInfo: { type: 'global', inputId: 'codebaseInfo' },
        architectureContext: { type: 'global', inputId: 'architectureContext' },
        knownIssues: { type: 'global', inputId: 'knownIssues' },
        businessContext: { type: 'global', inputId: 'businessContext' },
        assessmentScope: { type: 'static', value: 'Full Codebase' },
      },
      outputKey: 'debtInventory',
    },
    {
      id: 'step-prioritization',
      skillId: 'software-engineer-remediation-priority-ranker',
      name: 'Prioritize Remediation',
      description: 'Score and rank debt items for maximum impact',
      inputMappings: {
        debtItems: { type: 'computed', template: 'Technical debt inventory: {{debtInventory}}' },
        teamCapacity: { type: 'global', inputId: 'businessContext' },
        constraints: { type: 'global', inputId: 'businessContext' },
        priorityWeights: { type: 'static', value: 'Balanced (Default)' },
      },
      outputKey: 'prioritizedBacklog',
    },
    {
      id: 'step-stakeholder-brief',
      skillId: 'software-engineer-tech-debt-stakeholder-brief',
      name: 'Create Stakeholder Brief',
      description: 'Generate executive-friendly brief with ROI',
      inputMappings: {
        debtSummary: { type: 'computed', template: 'Debt assessment: {{debtInventory}}' },
        businessImpact: { type: 'computed', template: 'Prioritization analysis: {{prioritizedBacklog}}' },
        audience: { type: 'global', inputId: 'stakeholderAudience' },
        requestedOutcome: { type: 'static', value: 'Budget Approval' },
        competingPriorities: { type: 'global', inputId: 'businessContext' },
      },
      outputKey: 'stakeholderBrief',
    },
    {
      id: 'step-code-review',
      skillId: 'software-engineer-code-review-assistant',
      name: 'Sample Debt Analysis',
      description: 'Deep-dive analysis of highest-priority debt area',
      inputMappings: {
        code: { type: 'global', inputId: 'knownIssues' },
        language: { type: 'static', value: 'TypeScript' },
        codeType: { type: 'static', value: 'Production Code' },
        context: { type: 'computed', template: 'Technical debt context: {{prioritizedBacklog}}' },
        severity: { type: 'static', value: 'Deep Review (comprehensive)' },
      },
      outputKey: 'debtDeepDive',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW REGISTRY
// Export all workflows for use throughout the app
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW 15: AI IMPLEMENTATION WORKFLOW
// Complete end-to-end workflow for organizations implementing AI solutions
// ═══════════════════════════════════════════════════════════════════════════

export const AI_IMPLEMENTATION_WORKFLOW: Workflow = {
  id: 'ai-implementation',
  name: 'AI Implementation Journey',
  description: 'Complete end-to-end workflow for planning and executing AI initiatives in your organization',
  longDescription: 'This comprehensive workflow guides you through the entire AI implementation lifecycle: from use case prioritization and data readiness assessment, through risk analysis, business case development, pilot design, and architecture planning, to change management, security compliance, monitoring setup, and stakeholder communications.',
  icon: 'Brain',
  color: 'emerald',
  estimatedTime: '45-60 minutes',

  outputs: [
    'Prioritized AI use cases with scoring and recommendations',
    'Data readiness assessment with gap analysis',
    'Comprehensive risk assessment and mitigation plan',
    'Cost-benefit analysis with ROI projections',
    'Pilot program design with success criteria',
    'Integration architecture blueprint',
    'Change management playbook',
    'Security and privacy compliance assessment',
    'Performance monitoring dashboard specifications',
    'Stakeholder communication package'
  ],

  globalInputs: [
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Acme Corporation',
      required: true,
    },
    {
      id: 'industry',
      label: 'Industry',
      type: 'text',
      placeholder: 'e.g., Healthcare, Financial Services, Retail',
      required: true,
    },
    {
      id: 'companySize',
      label: 'Company Size',
      type: 'select',
      options: ['Startup (1-50)', 'Small (51-200)', 'Medium (201-1000)', 'Large (1001-5000)', 'Enterprise (5000+)'],
      required: true,
    },
    {
      id: 'aiUseCases',
      label: 'AI Use Cases to Evaluate',
      type: 'textarea',
      placeholder: 'List the AI use cases you are considering implementing...\n\nExample:\n1. Customer service chatbot\n2. Predictive maintenance for equipment\n3. Fraud detection system\n4. Demand forecasting',
      helpText: 'List each potential AI use case on a separate line with a brief description.',
      required: true,
      rows: 8,
    },
    {
      id: 'strategicPriorities',
      label: 'Strategic Priorities',
      type: 'textarea',
      placeholder: 'What are your organization\'s top strategic priorities?\n\nExample:\n- Reduce operational costs by 20%\n- Improve customer satisfaction (NPS > 50)\n- Launch 3 new digital products',
      required: true,
      rows: 6,
    },
    {
      id: 'budgetRange',
      label: 'AI Initiative Budget Range',
      type: 'select',
      options: ['Under $100K', '$100K - $500K', '$500K - $1M', '$1M - $5M', '$5M - $10M', 'Over $10M'],
      required: true,
    },
    {
      id: 'timeline',
      label: 'Implementation Timeline',
      type: 'select',
      options: ['3-6 months', '6-12 months', '12-18 months', '18-24 months', '24+ months'],
      required: true,
    },
    {
      id: 'currentTechStack',
      label: 'Current Technology Stack',
      type: 'textarea',
      placeholder: 'Describe your current technology environment...\n\nExample:\n- Cloud: AWS\n- Data: Snowflake, Kafka\n- Applications: Salesforce, SAP',
      required: true,
      rows: 6,
    },
    {
      id: 'dataLandscape',
      label: 'Current Data Landscape',
      type: 'textarea',
      placeholder: 'Describe your current data sources and infrastructure...\n\nExample:\n- Customer data in Salesforce (500K records)\n- Transaction data in PostgreSQL (10M records/month)\n- IoT sensor data (streaming)',
      required: true,
      rows: 6,
    },
    {
      id: 'teamCapabilities',
      label: 'Current AI/ML Team Capabilities',
      type: 'textarea',
      placeholder: 'Describe your current AI/ML capabilities...\n\nExample:\n- 2 data scientists (ML background)\n- 3 data engineers\n- No MLOps experience\n- Limited cloud AI/ML platform experience',
      required: false,
      rows: 4,
    },
    {
      id: 'complianceRequirements',
      label: 'Compliance Requirements',
      type: 'textarea',
      placeholder: 'List applicable regulations and compliance requirements...\n\nExample:\n- GDPR (EU customers)\n- HIPAA (healthcare data)\n- SOC 2 Type II',
      required: false,
      rows: 4,
    },
    {
      id: 'additionalContext',
      label: 'Additional Context (Optional)',
      type: 'textarea',
      placeholder: 'Any other relevant information about your AI initiative...',
      required: false,
      rows: 4,
    },
  ],

  steps: [
    {
      id: 'step-use-case-prioritization',
      skillId: 'ai-solutions-architect-ai-use-case-prioritization-framework',
      name: 'Prioritize AI Use Cases',
      description: 'Evaluate and prioritize AI opportunities using strategic impact analysis and feasibility scoring',
      inputMappings: {
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        annualRevenue: { type: 'literal', value: 'Not specified' },
        aiMaturityLevel: { type: 'literal', value: 'To be assessed' },
        strategicPriorities: { type: 'global', inputId: 'strategicPriorities' },
        useCasesToEvaluate: { type: 'global', inputId: 'aiUseCases' },
        budgetRange: { type: 'global', inputId: 'budgetRange' },
        timelineConstraints: { type: 'global', inputId: 'timeline' },
        technicalCapabilities: { type: 'global', inputId: 'teamCapabilities' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'useCasePrioritization',
    },
    {
      id: 'step-data-readiness',
      skillId: 'ai-solutions-architect-ai-data-readiness-audit',
      name: 'Assess Data Readiness',
      description: 'Comprehensive assessment of data infrastructure, quality, and governance',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        currentDataPlatform: { type: 'global', inputId: 'currentTechStack' },
        plannedAIUseCases: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        targetTimeline: { type: 'global', inputId: 'timeline' },
        dataBudget: { type: 'global', inputId: 'budgetRange' },
        primaryDataSources: { type: 'global', inputId: 'dataLandscape' },
        dataVolume: { type: 'literal', value: 'To be assessed during audit' },
        dataTeamSize: { type: 'global', inputId: 'teamCapabilities' },
        knownDataChallenges: { type: 'literal', value: 'To be identified during audit' },
        complianceRequirements: { type: 'global', inputId: 'complianceRequirements' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'dataReadinessAudit',
    },
    {
      id: 'step-risk-assessment',
      skillId: 'ai-solutions-architect-ai-risk-assessment-mitigation-plan',
      name: 'Assess Risks',
      description: 'Identify and analyze AI risks with mitigation strategies',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        riskAppetite: { type: 'literal', value: 'Moderate' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        technologyStack: { type: 'global', inputId: 'currentTechStack' },
        dataSources: { type: 'global', inputId: 'dataLandscape' },
        targetUsers: { type: 'literal', value: 'Internal and external stakeholders' },
        decisionImpact: { type: 'literal', value: 'Varies by use case - to be assessed' },
        existingControls: { type: 'literal', value: 'To be assessed' },
        previousIncidents: { type: 'literal', value: 'None reported' },
        currentRiskFramework: { type: 'literal', value: 'Standard enterprise risk management' },
        applicableRegulations: { type: 'global', inputId: 'complianceRequirements' },
        complianceRequirements: { type: 'global', inputId: 'complianceRequirements' },
        stakeholderConcerns: { type: 'literal', value: 'To be identified during assessment' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'riskAssessment',
    },
    {
      id: 'step-cost-benefit',
      skillId: 'ai-solutions-architect-ai-cost-benefit-analysis-calculator',
      name: 'Calculate ROI',
      description: 'Comprehensive financial analysis with TCO and ROI projections',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        annualRevenue: { type: 'literal', value: 'Not specified' },
        discountRate: { type: 'literal', value: '12%' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        projectScope: { type: 'literal', value: 'Enterprise-wide AI implementation' },
        expectedDuration: { type: 'global', inputId: 'timeline' },
        initialInvestment: { type: 'global', inputId: 'budgetRange' },
        ongoingCosts: { type: 'literal', value: 'To be calculated - includes infrastructure, personnel, maintenance' },
        teamSize: { type: 'global', inputId: 'teamCapabilities' },
        revenueImpact: { type: 'literal', value: 'To be estimated based on use cases' },
        costSavings: { type: 'literal', value: 'To be estimated based on automation and efficiency gains' },
        strategicBenefits: { type: 'global', inputId: 'strategicPriorities' },
        implementationTimeline: { type: 'global', inputId: 'timeline' },
        timeToValue: { type: 'literal', value: '6-12 months for initial value' },
        fullRollout: { type: 'global', inputId: 'timeline' },
        riskFactors: { type: 'previous', stepId: 'step-risk-assessment', outputKey: 'riskAssessment' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'costBenefitAnalysis',
    },
    {
      id: 'step-pilot-design',
      skillId: 'ai-solutions-architect-ai-pilot-program-designer',
      name: 'Design Pilot Program',
      description: 'Structure the pilot program with success criteria and measurement framework',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        aiMaturityLevel: { type: 'literal', value: 'Developing' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        businessObjectives: { type: 'global', inputId: 'strategicPriorities' },
        technicalApproach: { type: 'previous', stepId: 'step-data-readiness', outputKey: 'dataReadinessAudit' },
        targetUsers: { type: 'literal', value: 'To be defined based on use case' },
        geographicScope: { type: 'literal', value: 'Single location/team initially' },
        targetProcess: { type: 'literal', value: 'To be defined based on priority use case' },
        pilotDuration: { type: 'literal', value: '8-12 weeks' },
        baselineMetrics: { type: 'literal', value: 'To be established pre-pilot' },
        existingChallenges: { type: 'previous', stepId: 'step-risk-assessment', outputKey: 'riskAssessment' },
        pilotBudget: { type: 'literal', value: '10-15% of total budget' },
        teamAvailable: { type: 'global', inputId: 'teamCapabilities' },
        infrastructure: { type: 'global', inputId: 'currentTechStack' },
        constraints: { type: 'global', inputId: 'complianceRequirements' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'pilotDesign',
    },
    {
      id: 'step-architecture',
      skillId: 'ai-solutions-architect-ai-integration-architecture-blueprint',
      name: 'Design Architecture',
      description: 'Create comprehensive technical architecture for AI integration',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        currentTechStack: { type: 'global', inputId: 'currentTechStack' },
        useCaseDescription: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        predictionsPerDay: { type: 'literal', value: 'To be determined based on use case scale' },
        latencyRequirement: { type: 'literal', value: '<500ms for real-time, batch acceptable for analytics' },
        availabilityRequirement: { type: 'literal', value: '99.9% uptime' },
        sourceSystems: { type: 'global', inputId: 'dataLandscape' },
        targetSystems: { type: 'literal', value: 'To be defined based on integration requirements' },
        existingInfrastructure: { type: 'global', inputId: 'currentTechStack' },
        cloudProvider: { type: 'literal', value: 'To be determined based on existing stack' },
        budgetRange: { type: 'global', inputId: 'budgetRange' },
        complianceRequirements: { type: 'global', inputId: 'complianceRequirements' },
        timeline: { type: 'global', inputId: 'timeline' },
        teamCapabilities: { type: 'global', inputId: 'teamCapabilities' },
        additionalRequirements: { type: 'previous', stepId: 'step-data-readiness', outputKey: 'dataReadinessAudit' },
      },
      outputKey: 'architectureBlueprint',
    },
    {
      id: 'step-change-management',
      skillId: 'ai-solutions-architect-ai-change-management-playbook',
      name: 'Plan Change Management',
      description: 'Develop comprehensive change management strategy for AI adoption',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        employeeCount: { type: 'global', inputId: 'companySize' },
        geographicSpread: { type: 'literal', value: 'To be specified' },
        organizationalCulture: { type: 'literal', value: 'To be assessed' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        departmentsAffected: { type: 'literal', value: 'To be identified based on use cases' },
        rolesImpacted: { type: 'literal', value: 'To be identified during assessment' },
        estimatedUsers: { type: 'literal', value: 'To be calculated based on scope' },
        previousChangeInitiatives: { type: 'literal', value: 'To be documented' },
        knownConcerns: { type: 'previous', stepId: 'step-risk-assessment', outputKey: 'riskAssessment' },
        communicationChannels: { type: 'literal', value: 'Email, intranet, town halls, team meetings' },
        executiveSponsor: { type: 'literal', value: 'To be assigned' },
        programLead: { type: 'literal', value: 'To be assigned' },
        leadershipAlignment: { type: 'literal', value: 'In progress' },
        goLiveDate: { type: 'global', inputId: 'timeline' },
        prepTime: { type: 'literal', value: '3-6 months recommended' },
        constraints: { type: 'global', inputId: 'complianceRequirements' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'changeManagementPlaybook',
    },
    {
      id: 'step-security-compliance',
      skillId: 'ai-solutions-architect-ai-security-privacy-compliance-checker',
      name: 'Check Security & Compliance',
      description: 'Comprehensive security and privacy assessment for AI systems',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        geographicPresence: { type: 'literal', value: 'To be specified' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        dataTypes: { type: 'global', inputId: 'dataLandscape' },
        modelArchitecture: { type: 'previous', stepId: 'step-architecture', outputKey: 'architectureBlueprint' },
        deploymentModel: { type: 'literal', value: 'Cloud-based with potential hybrid components' },
        existingSecurityControls: { type: 'literal', value: 'Standard enterprise controls - to be assessed' },
        previousAssessments: { type: 'literal', value: 'To be documented' },
        knownVulnerabilities: { type: 'literal', value: 'None reported - to be assessed' },
        applicableRegulations: { type: 'global', inputId: 'complianceRequirements' },
        currentComplianceStatus: { type: 'literal', value: 'To be assessed' },
        auditHistory: { type: 'literal', value: 'To be documented' },
        dataSources: { type: 'global', inputId: 'dataLandscape' },
        dataStorage: { type: 'global', inputId: 'currentTechStack' },
        dataFlows: { type: 'previous', stepId: 'step-architecture', outputKey: 'architectureBlueprint' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'securityComplianceAssessment',
    },
    {
      id: 'step-monitoring',
      skillId: 'ai-solutions-architect-ai-performance-monitoring-dashboard-spec',
      name: 'Design Monitoring',
      description: 'Specify monitoring dashboards for AI system health and performance',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        companySize: { type: 'global', inputId: 'companySize' },
        currentMonitoringTools: { type: 'literal', value: 'Standard APM and infrastructure monitoring - to be assessed' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        modelTypes: { type: 'literal', value: 'To be determined based on use cases' },
        predictionVolume: { type: 'literal', value: 'To be estimated based on scale' },
        deploymentArchitecture: { type: 'previous', stepId: 'step-architecture', outputKey: 'architectureBlueprint' },
        dashboardUsers: { type: 'literal', value: 'Executives, technical team, business stakeholders' },
        executiveSponsors: { type: 'literal', value: 'To be assigned' },
        technicalTeam: { type: 'global', inputId: 'teamCapabilities' },
        existingMetrics: { type: 'literal', value: 'Standard business KPIs - to be documented' },
        currentPainPoints: { type: 'literal', value: 'Lack of AI-specific monitoring capabilities' },
        slaRequirements: { type: 'literal', value: '99.9% availability, <500ms latency' },
        cloudPlatform: { type: 'global', inputId: 'currentTechStack' },
        dataPipeline: { type: 'previous', stepId: 'step-data-readiness', outputKey: 'dataReadinessAudit' },
        existingDashboards: { type: 'literal', value: 'Standard operational dashboards - to be assessed' },
        keyMetrics: { type: 'previous', stepId: 'step-pilot-design', outputKey: 'pilotDesign' },
        alertRequirements: { type: 'literal', value: 'Tiered alerting with PagerDuty/Slack integration' },
        complianceNeeds: { type: 'global', inputId: 'complianceRequirements' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'monitoringSpec',
    },
    {
      id: 'step-communications',
      skillId: 'ai-solutions-architect-ai-stakeholder-communication-package',
      name: 'Create Communication Package',
      description: 'Develop comprehensive stakeholder communications for the AI initiative',
      inputMappings: {
        companyName: { type: 'global', inputId: 'companyName' },
        industry: { type: 'global', inputId: 'industry' },
        employeeCount: { type: 'global', inputId: 'companySize' },
        brandVoice: { type: 'literal', value: 'Professional, forward-thinking, transparent' },
        initiativeName: { type: 'literal', value: 'AI Transformation Initiative' },
        aiUseCase: { type: 'previous', stepId: 'step-use-case-prioritization', outputKey: 'useCasePrioritization' },
        businessImpact: { type: 'previous', stepId: 'step-cost-benefit', outputKey: 'costBenefitAnalysis' },
        timeline: { type: 'global', inputId: 'timeline' },
        keyAudiences: { type: 'literal', value: 'Board, executives, managers, employees, customers, regulators' },
        knownConcerns: { type: 'previous', stepId: 'step-change-management', outputKey: 'changeManagementPlaybook' },
        previousCommunications: { type: 'literal', value: 'None - new initiative' },
        primaryGoals: { type: 'literal', value: 'Build awareness, gain support, manage expectations, drive adoption' },
        keyMessages: { type: 'global', inputId: 'strategicPriorities' },
        successMetrics: { type: 'previous', stepId: 'step-pilot-design', outputKey: 'pilotDesign' },
        sensitiveTopics: { type: 'literal', value: 'Job impact, data privacy, AI decision-making' },
        legalRequirements: { type: 'global', inputId: 'complianceRequirements' },
        timingConsiderations: { type: 'global', inputId: 'timeline' },
        additionalContext: { type: 'global', inputId: 'additionalContext' },
      },
      outputKey: 'communicationPackage',
    },
  ],
};

// Import enterprise workflows
import { ENTERPRISE_WORKFLOWS } from './enterprise';
// Import governance & operations workflows
import { GOVERNANCE_OPS_WORKFLOWS } from './governanceOps';
// Import professional workflows
import { PROFESSIONAL_WORKFLOWS } from './professional';
// Import CPA/Accounting workflows
import { ACCOUNTING_WORKFLOWS } from './accounting';
// Import Staffing/Recruiting workflows
import { STAFFING_WORKFLOWS } from './staffing';
// Import PPC Agency workflows
import { PPC_AGENCY_WORKFLOWS } from './ppc-agency';

export const WORKFLOWS: Record<string, Workflow> = {
  'ai-implementation': AI_IMPLEMENTATION_WORKFLOW,
  'job-application': JOB_APPLICATION_WORKFLOW,
  'interview-prep': INTERVIEW_PREP_WORKFLOW,
  'post-interview': POST_INTERVIEW_WORKFLOW,
  'training-workshop': TRAINING_WORKSHOP_WORKFLOW,
  'seo-client-onboarding': SEO_CLIENT_ONBOARDING_WORKFLOW,
  'marketing-campaign': MARKETING_CAMPAIGN_WORKFLOW,
  'consulting-engagement': CONSULTING_ENGAGEMENT_WORKFLOW,
  'startup-investor-pitch': STARTUP_INVESTOR_PITCH_WORKFLOW,
  'sales-account-pursuit': SALES_ACCOUNT_PURSUIT_WORKFLOW,
  'customer-churn-prevention': CUSTOMER_CHURN_PREVENTION_WORKFLOW,
  'enterprise-account-expansion': ENTERPRISE_ACCOUNT_EXPANSION_WORKFLOW,
  'rfp-response-center': RFP_RESPONSE_CENTER_WORKFLOW,
  'revops-optimization': REVOPS_OPTIMIZATION_WORKFLOW,
  'tech-debt-assessment': TECH_DEBT_ASSESSMENT_WORKFLOW,
  // Enterprise workflows (new)
  ...ENTERPRISE_WORKFLOWS,
  // Governance & operations workflows (new)
  ...GOVERNANCE_OPS_WORKFLOWS,
  // Professional workflows (marketing, project management, business analysis)
  ...PROFESSIONAL_WORKFLOWS,
  // CPA/Accounting workflows (new client onboarding, tax season, audit, advisory, practice development)
  ...ACCOUNTING_WORKFLOWS,
  // Staffing/Recruiting workflows (job orders, candidate submission, client acquisition, retention, performance)
  ...STAFFING_WORKFLOWS,
  // PPC Agency workflows (master weekly workflow)
  ...PPC_AGENCY_WORKFLOWS,
};

export const WORKFLOW_LIST: Workflow[] = Object.values(WORKFLOWS);
