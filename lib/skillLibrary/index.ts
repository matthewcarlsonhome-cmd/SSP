/**
 * Skill Library - Unified skill repository
 *
 * Extracts skills from:
 * - Built-in static skills (lib/skills/static.ts)
 * - Role template dynamic skills (lib/roleTemplates.ts)
 * - Community skills (Supabase)
 *
 * And makes them all browsable with multi-dimensional filtering.
 */

import type {
  LibrarySkill,
  SkillCollection,
  RoleDefinition,
  LibraryFilters,
  LibrarySortOption,
  SkillCategory,
  SkillUseCase,
  SkillLevel,
} from './types';
import { ROLE_TEMPLATES } from '../roleTemplates';
import type { DynamicFormInput } from '../storage/types';
import { ALL_PROFESSIONAL_SKILLS } from '../skills/professional';
import { SKILLS } from '../skills/static';

// ═══════════════════════════════════════════════════════════════════════════
// STATIC SKILL MAPPINGS
// Map builtin skill IDs to their tags
// ═══════════════════════════════════════════════════════════════════════════

interface BuiltinSkillTags {
  category: SkillCategory;
  useCases: SkillUseCase[];
  level: SkillLevel;
  roles: string[];  // Role IDs this skill is useful for
}

const BUILTIN_SKILL_TAGS: Record<string, BuiltinSkillTags> = {
  'job-readiness-score': {
    category: 'analysis',
    useCases: ['job-search'],
    level: 'beginner',
    roles: [], // Universal - useful for all roles
  },
  'skills-gap-analyzer': {
    category: 'analysis',
    useCases: ['job-search', 'career-growth'],
    level: 'beginner',
    roles: [],
  },
  'linkedin-optimizer-pro': {
    category: 'optimization',
    useCases: ['job-search', 'networking', 'career-growth'],
    level: 'beginner',
    roles: [],
  },
  'ats-optimization-checker': {
    category: 'optimization',
    useCases: ['job-search'],
    level: 'intermediate',
    roles: [],
  },
  'resume-customizer': {
    category: 'generation',
    useCases: ['job-search'],
    level: 'beginner',
    roles: [],
  },
  'cover-letter-generator': {
    category: 'generation',
    useCases: ['job-search'],
    level: 'beginner',
    roles: [],
  },
  'networking-script-generator': {
    category: 'generation',
    useCases: ['networking', 'job-search'],
    level: 'intermediate',
    roles: [],
  },
  'company-research': {
    category: 'research',
    useCases: ['job-search', 'interview-prep'],
    level: 'beginner',
    roles: [],
  },
  'interview-prep': {
    category: 'generation',
    useCases: ['interview-prep'],
    level: 'intermediate',
    roles: [],
  },
  'thank-you-note-generator': {
    category: 'generation',
    useCases: ['interview-prep'],
    level: 'beginner',
    roles: [],
  },
  'offer-evaluation-pro': {
    category: 'analysis',
    useCases: ['job-search'],
    level: 'intermediate',
    roles: [],
  },
  'salary-negotiation-master': {
    category: 'generation',
    useCases: ['job-search', 'career-growth'],
    level: 'advanced',
    roles: [],
  },
  'onboarding-accelerator-pro': {
    category: 'generation',
    useCases: ['onboarding'],
    level: 'beginner',
    roles: [],
  },
  'day-in-the-life-generator': {
    category: 'research',
    useCases: ['job-search', 'interview-prep'],
    level: 'beginner',
    roles: [],
  },
  'role-ai-automation-analyzer': {
    category: 'analysis',
    useCases: ['career-growth', 'daily-work'],
    level: 'intermediate',
    roles: [],
  },
  'healthcare-resume-parser': {
    category: 'analysis',
    useCases: ['job-search'],
    level: 'intermediate',
    roles: ['healthcare-professional'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const ROLE_DEFINITIONS: RoleDefinition[] = ROLE_TEMPLATES.map((role) => ({
  id: role.id,
  name: role.name,
  icon: role.icon,
  color: role.color,
}));

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT DYNAMIC SKILLS FROM ROLE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a role template dynamic skill to LibrarySkill format
 */
function convertDynamicSkill(
  skill: typeof ROLE_TEMPLATES[0]['dynamicSkills'][0],
  roleId: string,
  roleName: string,
  index: number
): LibrarySkill {
  // Generate a unique ID based on role and skill name
  const skillId = `${roleId}-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Map DynamicFormInput validation to our format
  const inputs: DynamicFormInput[] = skill.inputs.map((input) => ({
    id: input.id,
    label: input.label,
    type: input.type as DynamicFormInput['type'],
    placeholder: input.placeholder,
    options: input.options,
    validation: input.validation,
  }));

  // Determine use cases based on skill content
  const useCases: SkillUseCase[] = determineUseCases(skill.name, skill.description);

  return {
    id: skillId,
    name: skill.name,
    description: skill.description,
    longDescription: skill.longDescription,
    estimatedTimeSaved: skill.estimatedTimeSaved,
    tags: {
      roles: [roleId],
      category: skill.category as SkillCategory,
      useCases,
      level: 'intermediate',
    },
    source: 'role-template',
    sourceRoleId: roleId,
    theme: {
      primary: skill.theme.primary,
      secondary: skill.theme.secondary,
      gradient: skill.theme.gradient,
      iconName: skill.theme.iconName,
    },
    inputs,
    prompts: {
      systemInstruction: skill.prompts.systemInstruction,
      userPromptTemplate: skill.prompts.userPromptTemplate,
      outputFormat: skill.prompts.outputFormat,
    },
    config: {
      recommendedModel: skill.config.recommendedModel,
      useWebSearch: skill.config.useWebSearch,
      maxTokens: skill.config.maxTokens,
      temperature: skill.config.temperature,
    },
    useCount: 0,
    rating: { sum: 0, count: 0 },
  };
}

/**
 * Determine use cases based on skill name and description
 */
function determineUseCases(name: string, description: string): SkillUseCase[] {
  const text = `${name} ${description}`.toLowerCase();
  const useCases: SkillUseCase[] = [];

  if (text.includes('interview') || text.includes('question')) {
    useCases.push('interview-prep');
  }
  if (text.includes('network') || text.includes('outreach') || text.includes('linkedin')) {
    useCases.push('networking');
  }
  if (text.includes('onboard') || text.includes('first 90') || text.includes('new role')) {
    useCases.push('onboarding');
  }
  if (text.includes('resume') || text.includes('job search') || text.includes('application')) {
    useCases.push('job-search');
  }
  if (text.includes('career') || text.includes('growth') || text.includes('development')) {
    useCases.push('career-growth');
  }

  // Default to daily-work if no specific use case found
  if (useCases.length === 0) {
    useCases.push('daily-work');
  }

  return useCases;
}

/**
 * Extract all dynamic skills from all role templates
 */
function extractAllDynamicSkills(): LibrarySkill[] {
  const skills: LibrarySkill[] = [];

  for (const role of ROLE_TEMPLATES) {
    for (let i = 0; i < role.dynamicSkills.length; i++) {
      const skill = convertDynamicSkill(role.dynamicSkills[i], role.id, role.name, i);
      skills.push(skill);
    }
  }

  return skills;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILTIN SKILLS CONVERSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create placeholder LibrarySkill entries for builtin static skills
 * These reference the existing SKILLS object but with library metadata
 */
function createBuiltinSkillEntries(): LibrarySkill[] {
  const builtinSkills: LibrarySkill[] = [
    {
      id: 'job-readiness-score',
      name: 'Job Readiness Scorer',
      description: 'Quantified 0-100 assessment of candidate fit for any role with actionable improvement plan.',
      longDescription: 'Analyzes resume against job description to score Hard Skills, Experience Relevance, Soft Skills, Career Trajectory, and Resume Optimization.',
      whatYouGet: ['Overall Readiness Score (0-100)', 'Weighted Component Breakdown', 'Top 5 Strengths & All Gaps', 'Prioritized Action Plan'],
      estimatedTimeSaved: '2-3 hours of self-assessment',
      tags: BUILTIN_SKILL_TAGS['job-readiness-score'],
      source: 'builtin',
      theme: { primary: 'text-blue-400', secondary: 'bg-blue-900/20', gradient: 'from-blue-500/20 to-transparent', iconName: 'Target' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'skills-gap-analyzer',
      name: 'Skills Gap Analyzer',
      description: 'Identify skill gaps between your background and target role requirements.',
      longDescription: 'Compares your current skills against job requirements and provides a roadmap to close gaps.',
      whatYouGet: ['Gap Analysis Report', 'Priority Learning Path', 'Resource Recommendations'],
      estimatedTimeSaved: '3-4 hours of research',
      tags: BUILTIN_SKILL_TAGS['skills-gap-analyzer'],
      source: 'builtin',
      theme: { primary: 'text-purple-400', secondary: 'bg-purple-900/20', gradient: 'from-purple-500/20 to-transparent', iconName: 'BarChart' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'linkedin-optimizer-pro',
      name: 'LinkedIn Optimizer Pro',
      description: 'Optimize your LinkedIn profile for visibility and recruiter searches.',
      longDescription: 'Analyzes and improves your LinkedIn headline, summary, and experience sections for maximum impact.',
      whatYouGet: ['Optimized Headline', 'Compelling Summary', 'Keyword Recommendations', 'Profile Score'],
      estimatedTimeSaved: '2-4 hours of optimization',
      tags: BUILTIN_SKILL_TAGS['linkedin-optimizer-pro'],
      source: 'builtin',
      theme: { primary: 'text-sky-400', secondary: 'bg-sky-900/20', gradient: 'from-sky-500/20 to-transparent', iconName: 'Linkedin' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'ats-optimization-checker',
      name: 'ATS Optimization Checker',
      description: 'Ensure your resume passes Applicant Tracking System filters.',
      longDescription: 'Scans your resume for ATS compatibility issues and suggests improvements for better parsing.',
      whatYouGet: ['ATS Compatibility Score', 'Formatting Issues', 'Keyword Optimization', 'Section Recommendations'],
      estimatedTimeSaved: '1-2 hours of manual checking',
      tags: BUILTIN_SKILL_TAGS['ats-optimization-checker'],
      source: 'builtin',
      theme: { primary: 'text-green-400', secondary: 'bg-green-900/20', gradient: 'from-green-500/20 to-transparent', iconName: 'FileCheck' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'resume-customizer',
      name: 'Resume Customizer',
      description: 'Tailor your resume for specific job applications.',
      longDescription: 'Rewrites and reorganizes your resume to highlight relevant experience for each application.',
      whatYouGet: ['Customized Resume', 'Highlighted Achievements', 'Keyword Integration'],
      estimatedTimeSaved: '30-60 min per application',
      tags: BUILTIN_SKILL_TAGS['resume-customizer'],
      source: 'builtin',
      theme: { primary: 'text-amber-400', secondary: 'bg-amber-900/20', gradient: 'from-amber-500/20 to-transparent', iconName: 'FileEdit' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'cover-letter-generator',
      name: 'Cover Letter Generator',
      description: 'Generate compelling, personalized cover letters.',
      longDescription: 'Creates tailored cover letters that connect your experience to job requirements.',
      whatYouGet: ['Personalized Cover Letter', 'Company-Specific Content', 'Call to Action'],
      estimatedTimeSaved: '30-45 min per letter',
      tags: BUILTIN_SKILL_TAGS['cover-letter-generator'],
      source: 'builtin',
      theme: { primary: 'text-rose-400', secondary: 'bg-rose-900/20', gradient: 'from-rose-500/20 to-transparent', iconName: 'Mail' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.5 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'networking-script-generator',
      name: 'Networking Script Generator',
      description: 'Create scripts for networking outreach and informational interviews.',
      longDescription: 'Generates personalized outreach messages and conversation guides for networking.',
      whatYouGet: ['Outreach Templates', 'Conversation Starters', 'Follow-up Messages'],
      estimatedTimeSaved: '20-30 min per contact',
      tags: BUILTIN_SKILL_TAGS['networking-script-generator'],
      source: 'builtin',
      theme: { primary: 'text-indigo-400', secondary: 'bg-indigo-900/20', gradient: 'from-indigo-500/20 to-transparent', iconName: 'Users' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.5 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'company-research',
      name: 'Company Research',
      description: 'Deep dive research on target companies for interviews.',
      longDescription: 'Compiles comprehensive company information including culture, news, and interview tips.',
      whatYouGet: ['Company Overview', 'Recent News', 'Culture Insights', 'Interview Tips'],
      estimatedTimeSaved: '2-4 hours of research',
      tags: BUILTIN_SKILL_TAGS['company-research'],
      source: 'builtin',
      theme: { primary: 'text-cyan-400', secondary: 'bg-cyan-900/20', gradient: 'from-cyan-500/20 to-transparent', iconName: 'Building' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: true, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'interview-prep',
      name: 'Interview Prep',
      description: 'Prepare for interviews with tailored questions and STAR stories.',
      longDescription: 'Generates likely interview questions and helps you prepare compelling responses.',
      whatYouGet: ['Expected Questions', 'STAR Story Templates', 'Questions to Ask'],
      estimatedTimeSaved: '3-5 hours of prep',
      tags: BUILTIN_SKILL_TAGS['interview-prep'],
      source: 'builtin',
      theme: { primary: 'text-violet-400', secondary: 'bg-violet-900/20', gradient: 'from-violet-500/20 to-transparent', iconName: 'MessageCircle' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'thank-you-note-generator',
      name: 'Thank You Note Generator',
      description: 'Create professional post-interview thank you notes.',
      longDescription: 'Generates personalized thank you notes that reinforce your candidacy.',
      whatYouGet: ['Personalized Thank You', 'Key Point Reinforcement', 'Professional Tone'],
      estimatedTimeSaved: '15-20 min per note',
      tags: BUILTIN_SKILL_TAGS['thank-you-note-generator'],
      source: 'builtin',
      theme: { primary: 'text-pink-400', secondary: 'bg-pink-900/20', gradient: 'from-pink-500/20 to-transparent', iconName: 'Heart' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 2048, temperature: 0.5 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'offer-evaluation-pro',
      name: 'Offer Evaluation Pro',
      description: 'Comprehensively evaluate job offers and compensation packages.',
      longDescription: 'Analyzes total compensation, benefits, and growth potential to help you make informed decisions.',
      whatYouGet: ['Compensation Analysis', 'Benefits Comparison', 'Negotiation Points'],
      estimatedTimeSaved: '2-3 hours of analysis',
      tags: BUILTIN_SKILL_TAGS['offer-evaluation-pro'],
      source: 'builtin',
      theme: { primary: 'text-emerald-400', secondary: 'bg-emerald-900/20', gradient: 'from-emerald-500/20 to-transparent', iconName: 'DollarSign' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: true, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'salary-negotiation-master',
      name: 'Salary Negotiation Master',
      description: 'Develop strategies and scripts for salary negotiations.',
      longDescription: 'Provides negotiation tactics, scripts, and market data to maximize your offer.',
      whatYouGet: ['Negotiation Strategy', 'Response Scripts', 'Counter-Offer Guidance'],
      estimatedTimeSaved: '3-5 hours of preparation',
      tags: BUILTIN_SKILL_TAGS['salary-negotiation-master'],
      source: 'builtin',
      theme: { primary: 'text-yellow-400', secondary: 'bg-yellow-900/20', gradient: 'from-yellow-500/20 to-transparent', iconName: 'TrendingUp' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: true, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'onboarding-accelerator-pro',
      name: 'Onboarding Accelerator Pro',
      description: 'Create a 90-day success plan for your new role.',
      longDescription: 'Develops a comprehensive onboarding plan with milestones, relationship building, and quick wins.',
      whatYouGet: ['30-60-90 Day Plan', 'Stakeholder Map', 'Quick Wins List', 'Learning Priorities'],
      estimatedTimeSaved: '4-6 hours of planning',
      tags: BUILTIN_SKILL_TAGS['onboarding-accelerator-pro'],
      source: 'builtin',
      theme: { primary: 'text-orange-400', secondary: 'bg-orange-900/20', gradient: 'from-orange-500/20 to-transparent', iconName: 'Rocket' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'day-in-the-life-generator',
      name: 'Day in the Life Generator',
      description: 'Visualize what a typical day looks like in your target role.',
      longDescription: 'Creates a realistic daily schedule based on role requirements and industry norms.',
      whatYouGet: ['Daily Schedule', 'Task Breakdown', 'Meeting Types', 'Work-Life Balance Insights'],
      estimatedTimeSaved: '1-2 hours of research',
      tags: BUILTIN_SKILL_TAGS['day-in-the-life-generator'],
      source: 'builtin',
      theme: { primary: 'text-teal-400', secondary: 'bg-teal-900/20', gradient: 'from-teal-500/20 to-transparent', iconName: 'Calendar' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: true, maxTokens: 4096, temperature: 0.5 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'role-ai-automation-analyzer',
      name: 'Role AI Automation Analyzer',
      description: 'Analyze how AI might impact your role and identify opportunities.',
      longDescription: 'Assesses automation risk and suggests ways to leverage AI in your role.',
      whatYouGet: ['Automation Risk Score', 'AI Opportunities', 'Skill Recommendations', 'Future-Proofing Plan'],
      estimatedTimeSaved: '2-4 hours of research',
      tags: BUILTIN_SKILL_TAGS['role-ai-automation-analyzer'],
      source: 'builtin',
      theme: { primary: 'text-fuchsia-400', secondary: 'bg-fuchsia-900/20', gradient: 'from-fuchsia-500/20 to-transparent', iconName: 'Brain' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: true, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
    {
      id: 'healthcare-resume-parser',
      name: 'Healthcare Resume Parser',
      description: 'Specialized resume analysis for healthcare professionals.',
      longDescription: 'Parses healthcare resumes with understanding of certifications, clinical experience, and compliance requirements.',
      whatYouGet: ['Credential Analysis', 'Experience Summary', 'Compliance Checklist', 'Improvement Suggestions'],
      estimatedTimeSaved: '1-2 hours of analysis',
      tags: BUILTIN_SKILL_TAGS['healthcare-resume-parser'],
      source: 'builtin',
      theme: { primary: 'text-red-400', secondary: 'bg-red-900/20', gradient: 'from-red-500/20 to-transparent', iconName: 'Stethoscope' },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.3 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    },
  ];

  return builtinSkills;
}

// ═══════════════════════════════════════════════════════════════════════════
// CURATED COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const SKILL_COLLECTIONS: SkillCollection[] = [
  {
    id: 'job-search-starter',
    name: 'Job Search Starter Kit',
    description: 'Essential skills to kickstart your job search',
    icon: 'Briefcase',
    color: 'text-blue-500',
    skillIds: [
      'job-readiness-score',
      'resume-customizer',
      'cover-letter-generator',
      'ats-optimization-checker',
    ],
    priority: 1,
    featured: true,
  },
  {
    id: 'interview-prep',
    name: 'Interview Preparation',
    description: 'Get ready to ace your interviews',
    icon: 'Users',
    color: 'text-violet-500',
    skillIds: [
      'company-research',
      'interview-prep',
      'day-in-the-life-generator',
      'thank-you-note-generator',
    ],
    priority: 2,
    featured: true,
  },
  {
    id: 'career-growth',
    name: 'Career Growth',
    description: 'Tools for long-term career development',
    icon: 'TrendingUp',
    color: 'text-emerald-500',
    skillIds: [
      'skills-gap-analyzer',
      'linkedin-optimizer-pro',
      'role-ai-automation-analyzer',
      'networking-script-generator',
    ],
    priority: 3,
    featured: true,
  },
  {
    id: 'negotiation-offers',
    name: 'Negotiation & Offers',
    description: 'Maximize your compensation package',
    icon: 'DollarSign',
    color: 'text-yellow-500',
    skillIds: [
      'offer-evaluation-pro',
      'salary-negotiation-master',
    ],
    priority: 4,
    featured: false,
  },
  {
    id: 'first-90-days',
    name: 'First 90 Days',
    description: 'Hit the ground running in your new role',
    icon: 'Rocket',
    color: 'text-orange-500',
    skillIds: [
      'onboarding-accelerator-pro',
    ],
    priority: 5,
    featured: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SKILL LIBRARY SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _allSkills: LibrarySkill[] | null = null;

/**
 * Convert professional skills to LibrarySkill format
 */
function extractProfessionalSkills(): LibrarySkill[] {
  return ALL_PROFESSIONAL_SKILLS.map((skill, index) => {
    // Determine role based on skill characteristics
    const roleMapping: Record<string, { id: string; name: string }> = {
      'Campaign': { id: 'marketing-manager', name: 'Marketing Manager' },
      'Brand': { id: 'marketing-manager', name: 'Marketing Manager' },
      'Market': { id: 'marketing-manager', name: 'Marketing Manager' },
      'Content': { id: 'marketing-manager', name: 'Marketing Manager' },
      'SEO': { id: 'digital-marketing', name: 'Digital Marketing' },
      'PPC': { id: 'digital-marketing', name: 'Digital Marketing' },
      'Social': { id: 'digital-marketing', name: 'Digital Marketing' },
      'Email': { id: 'digital-marketing', name: 'Digital Marketing' },
      'Analytics': { id: 'digital-marketing', name: 'Digital Marketing' },
      'Conversion': { id: 'digital-marketing', name: 'Digital Marketing' },
      'Project': { id: 'project-manager', name: 'Project Manager' },
      'Sprint': { id: 'project-manager', name: 'Project Manager' },
      'Risk': { id: 'project-manager', name: 'Project Manager' },
      'Stakeholder': { id: 'project-manager', name: 'Project Manager' },
      'Status': { id: 'project-manager', name: 'Project Manager' },
      'Resource': { id: 'project-manager', name: 'Project Manager' },
      'BRD': { id: 'business-analyst', name: 'Business Analyst' },
      'Requirements': { id: 'business-analyst', name: 'Business Analyst' },
      'Process': { id: 'business-analyst', name: 'Business Analyst' },
      'Gap': { id: 'business-analyst', name: 'Business Analyst' },
      'Data': { id: 'business-analyst', name: 'Business Analyst' },
      'User': { id: 'business-analyst', name: 'Business Analyst' },
    };

    // Find role based on skill name
    let roleInfo = { id: 'professional', name: 'Professional' };
    for (const [keyword, info] of Object.entries(roleMapping)) {
      if (skill.name.includes(keyword)) {
        roleInfo = info;
        break;
      }
    }

    const skillId = `professional-${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    return {
      id: skillId,
      name: skill.name,
      description: skill.description,
      longDescription: skill.longDescription || skill.description,
      source: 'role-template' as const,
      category: (skill.category || 'generation') as SkillCategory,
      tags: {
        category: (skill.category || 'generation') as SkillCategory,
        useCases: ['daily-work' as SkillUseCase],
        level: 'intermediate' as SkillLevel,
        roles: [roleInfo.id],
      },
      theme: skill.theme,
      role: roleInfo,
      prompts: skill.prompts,
      executionConfig: {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096,
        temperature: 0.7,
      },
      inputs: skill.inputs as DynamicFormInput[],
      estimatedTime: skill.estimatedTimeSaved || '10-15 minutes',
      popularity: 50 + index,
      rating: 4.5,
    };
  });
}

/**
 * Convert ALL static skills from SKILLS object to LibrarySkill format
 * This includes all 73 skills: job-seeker, governance, excel, enterprise, extended,
 * sales, product, technical, hr, and operations
 */
function extractAllStaticSkills(): LibrarySkill[] {
  return Object.entries(SKILLS).map(([id, skill]) => {
    // Determine category from skill ID prefix
    const categoryMatch = id.match(/^([a-z-]+?)-/);
    const categoryHint = categoryMatch ? categoryMatch[1] : 'other';

    // Map category hints to SkillCategory
    const categoryMapping: Record<string, SkillCategory> = {
      'job': 'analysis',
      'skills': 'analysis',
      'excel': 'analysis',
      'sales': 'communication',
      'proposal': 'generation',
      'customer': 'analysis',
      'competitive': 'research',
      'prd': 'generation',
      'technical': 'generation',
      'api': 'generation',
      'code': 'analysis',
      'incident': 'generation',
      'employee': 'generation',
      'performance': 'generation',
      'org': 'communication',
      'sop': 'generation',
      'contract': 'analysis',
      'policy': 'generation',
      'vendor': 'analysis',
      'board': 'generation',
      'executive': 'communication',
      'crisis': 'communication',
      'stakeholder': 'communication',
      'ai': 'analysis',
      'compliance': 'analysis',
      'regulatory': 'analysis',
      'audit': 'generation',
      'rfp': 'generation',
      'meeting': 'generation',
      'project': 'generation',
      'process': 'automation',
      'automation': 'automation',
      'email': 'generation',
      'content': 'generation',
      'seo': 'optimization',
      'investor': 'generation',
      'pitch': 'generation',
      'financial': 'analysis',
      'product': 'generation',
      'pricing': 'analysis',
      'partnership': 'analysis',
      'market': 'research',
      'team': 'analysis',
      'retrospective': 'generation',
    };

    const category = categoryMapping[categoryHint] || 'generation';

    // Determine use cases based on skill content
    const useCases: SkillUseCase[] = ['daily-work'];
    if (id.includes('job') || id.includes('resume') || id.includes('interview')) {
      useCases.push('job-search');
    }
    if (id.includes('onboarding')) {
      useCases.push('onboarding');
    }

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      longDescription: skill.longDescription || skill.description,
      whatYouGet: skill.whatYouGet || [],
      estimatedTimeSaved: '15-30 minutes',
      tags: {
        category,
        useCases,
        level: 'intermediate' as SkillLevel,
        roles: [],
      },
      source: 'builtin' as const,
      theme: {
        primary: skill.theme?.primary || 'text-blue-400',
        secondary: skill.theme?.secondary || 'bg-blue-900/20',
        gradient: skill.theme?.gradient || 'from-blue-500/20 to-transparent',
        iconName: 'Zap',
      },
      inputs: [],
      prompts: { systemInstruction: '', userPromptTemplate: '', outputFormat: 'markdown' as const },
      config: { recommendedModel: 'any', useWebSearch: false, maxTokens: 4096, temperature: 0.4 },
      useCount: 0,
      rating: { sum: 0, count: 0 },
    };
  });
}

/**
 * Get all skills from all sources (static + role templates + professional)
 * Community skills are loaded separately from Supabase
 */
export function getAllLibrarySkills(): LibrarySkill[] {
  if (!_allSkills) {
    // Use extractAllStaticSkills to include ALL 73 static skills with correct IDs
    const staticSkills = extractAllStaticSkills();
    const templateSkills = extractAllDynamicSkills();
    const professionalSkills = extractProfessionalSkills();
    _allSkills = [...staticSkills, ...templateSkills, ...professionalSkills];
  }
  return _allSkills;
}

/**
 * Get a single skill by ID
 */
export function getLibrarySkill(id: string): LibrarySkill | undefined {
  return getAllLibrarySkills().find((s) => s.id === id);
}

/**
 * Get skills for a specific role
 */
export function getSkillsByRole(roleId: string): LibrarySkill[] {
  const allSkills = getAllLibrarySkills();
  return allSkills.filter(
    (skill) =>
      skill.tags.roles.length === 0 || // Universal skills
      skill.tags.roles.includes(roleId)
  );
}

/**
 * Get skills in a collection
 */
export function getCollectionSkills(collectionId: string): LibrarySkill[] {
  const collection = SKILL_COLLECTIONS.find((c) => c.id === collectionId);
  if (!collection) return [];

  const allSkills = getAllLibrarySkills();
  return collection.skillIds
    .map((id) => allSkills.find((s) => s.id === id))
    .filter((s): s is LibrarySkill => s !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERING & SORTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter skills by multiple criteria
 */
export function filterSkills(
  skills: LibrarySkill[],
  filters: LibraryFilters
): LibrarySkill[] {
  return skills.filter((skill) => {
    // Skill IDs filter (for collections) - takes precedence
    if (filters.skillIds && filters.skillIds.length > 0) {
      if (!filters.skillIds.includes(skill.id)) return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        skill.name.toLowerCase().includes(searchLower) ||
        skill.description.toLowerCase().includes(searchLower) ||
        (skill.longDescription?.toLowerCase().includes(searchLower) ?? false);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.categories.length > 0) {
      if (!filters.categories.includes(skill.tags.category)) return false;
    }

    // Role filter
    if (filters.roles.length > 0) {
      // Skill matches if it's universal (no roles) or has any matching role
      const isUniversal = skill.tags.roles.length === 0;
      const hasMatchingRole = filters.roles.some((r) => skill.tags.roles.includes(r));
      if (!isUniversal && !hasMatchingRole) return false;
    }

    // Use case filter
    if (filters.useCases.length > 0) {
      const hasMatchingUseCase = filters.useCases.some((uc) =>
        skill.tags.useCases.includes(uc)
      );
      if (!hasMatchingUseCase) return false;
    }

    // Level filter
    if (filters.levels.length > 0) {
      if (!filters.levels.includes(skill.tags.level)) return false;
    }

    // Source filter
    if (filters.sources.length > 0) {
      if (!filters.sources.includes(skill.source)) return false;
    }

    return true;
  });
}

/**
 * Sort skills by various criteria
 */
export function sortSkills(
  skills: LibrarySkill[],
  sortBy: LibrarySortOption
): LibrarySkill[] {
  const sorted = [...skills];

  switch (sortBy) {
    case 'popular':
      sorted.sort((a, b) => b.useCount - a.useCount);
      break;
    case 'rating':
      sorted.sort((a, b) => {
        const ratingA = a.rating.count > 0 ? a.rating.sum / a.rating.count : 0;
        const ratingB = b.rating.count > 0 ? b.rating.sum / b.rating.count : 0;
        return ratingB - ratingA;
      });
      break;
    case 'newest':
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return sorted;
}

/**
 * Get count of skills per role
 */
export function getSkillCountByRole(): Record<string, number> {
  const allSkills = getAllLibrarySkills();
  const counts: Record<string, number> = {};

  for (const role of ROLE_DEFINITIONS) {
    counts[role.id] = allSkills.filter(
      (skill) =>
        skill.tags.roles.length === 0 || skill.tags.roles.includes(role.id)
    ).length;
  }

  return counts;
}

/**
 * Get count of skills per category
 */
export function getSkillCountByCategory(): Record<SkillCategory, number> {
  const allSkills = getAllLibrarySkills();
  const counts: Record<SkillCategory, number> = {
    analysis: 0,
    generation: 0,
    automation: 0,
    optimization: 0,
    communication: 0,
    research: 0,
  };

  for (const skill of allSkills) {
    counts[skill.tags.category]++;
  }

  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADING EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADER EXPORTS (TypeScript-based, being deprecated)
// For scalable, on-demand skill loading from TypeScript definitions
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Metadata (lightweight, for browsing)
  loadSkillMetadata,
  getSkillMetadata,
  getAllSkillMetadata,
  // Full definitions (on-demand)
  loadFullSkillDefinition,
  loadExecutableSkill,
  // Cache management
  clearSkillCaches,
  preloadSkillMetadata,
  // Types
  type SkillMetadata,
  type FullSkillDefinition,
  type ExecutableSkill,
} from './lazyLoader';

// ═══════════════════════════════════════════════════════════════════════════
// DB-FIRST LOADER EXPORTS (NEW - Database as single source of truth)
// Use these functions for the new architecture where skills are loaded
// entirely from the database. This is the recommended approach.
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Metadata loading (from database)
  loadAllSkillMetadata as loadAllSkillMetadataFromDb,
  getSkillMetadata as getSkillMetadataFromDb,
  getAllSkillMetadataArray as getAllSkillMetadataFromDb,
  // Full skill loading (from database)
  loadExecutableSkill as loadExecutableSkillFromDb,
  loadExecutableSkills as loadExecutableSkillsFromDb,
  // Filtering (uses cached DB data)
  filterSkills as filterSkillsFromDb,
  // Usage tracking
  trackSkillUsage,
  // Cache management
  clearAllCaches as clearDbSkillCaches,
  clearSkillCache as clearSingleDbSkillCache,
  preloadSkillMetadata as preloadDbSkillMetadata,
  // Conversion helpers (for backward compatibility)
  toLibrarySkill,
  toExecutableLibrarySkill,
  // Types
  type DbSkillMetadata,
  type DbExecutableSkill,
  type SkillFilters as DbSkillFilters,
} from './dbLoader';

// ═══════════════════════════════════════════════════════════════════════════
// DB-FIRST ASYNC WRAPPERS
// These provide the same interface as the sync functions above,
// but load from the database instead of TypeScript definitions.
// ═══════════════════════════════════════════════════════════════════════════

import {
  loadAllSkillMetadata,
  loadExecutableSkill as dbLoadExecutableSkill,
  toLibrarySkill,
  toExecutableLibrarySkill,
} from './dbLoader';

/**
 * Get all library skills from the database (async)
 * This is the DB-first equivalent of getAllLibrarySkills()
 */
export async function getAllLibrarySkillsAsync(): Promise<LibrarySkill[]> {
  const metadata = await loadAllSkillMetadata();
  return Array.from(metadata.values()).map(toLibrarySkill);
}

/**
 * Get a single skill by ID from the database (async)
 * This is the DB-first equivalent of getLibrarySkill()
 */
export async function getLibrarySkillAsync(id: string): Promise<LibrarySkill | undefined> {
  const metadata = await loadAllSkillMetadata();
  const dbSkill = metadata.get(id);
  return dbSkill ? toLibrarySkill(dbSkill) : undefined;
}

/**
 * Get an executable skill with prompts from the database (async)
 * This is the primary function for executing skills in DB-first mode
 */
export async function getExecutableSkillAsync(id: string): Promise<LibrarySkill | null> {
  const dbSkill = await dbLoadExecutableSkill(id);
  return dbSkill ? toExecutableLibrarySkill(dbSkill) : null;
}

/**
 * Filter skills from the database (async)
 * This is the DB-first equivalent of filterSkills()
 */
export async function filterLibrarySkillsAsync(
  filters: LibraryFilters
): Promise<LibrarySkill[]> {
  const allSkills = await getAllLibrarySkillsAsync();
  return filterSkills(allSkills, filters);
}
