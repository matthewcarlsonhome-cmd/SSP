/**
 * App.tsx - Main Application Entry Point
 *
 * This is the root component of SkillEngine, an AI-powered job search automation platform.
 * It establishes the application's provider hierarchy and routing configuration.
 *
 * ARCHITECTURE OVERVIEW:
 * =====================
 * The app uses a nested provider pattern where each provider wraps the next,
 * creating a hierarchy of context availability:
 *
 *   AuthProvider (Supabase authentication)
 *     └── AppProvider (Global app state: resume, job description, API selection)
 *           └── Router (HashRouter for Netlify static hosting compatibility)
 *                 └── ThemeProvider (Dark/light mode toggle)
 *                       └── ToastProvider (Notification system)
 *                             └── App Layout & Routes
 *
 * WHY HASHROUTER?
 * ===============
 * We use HashRouter instead of BrowserRouter because this app is deployed
 * on Netlify as a static site. HashRouter uses URL fragments (/#/path)
 * which work without server-side routing configuration.
 *
 * PAGE CATEGORIES:
 * ================
 * 1. Core Pages - Dashboard, Home, Profile, Welcome
 * 2. AI Skills - Browse, Run, and manage the 16 built-in AI skills
 * 3. Custom Skills - Analyze roles and build custom AI skills dynamically
 * 4. Community - Share and discover community-created skills (Supabase)
 * 5. Job Search Tools - Tracker, Interview prep, Networking, etc.
 * 6. Utilities - Batch processing, Export, Settings
 */

import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT PROVIDERS
// These provide global state and functionality throughout the app
// ─────────────────────────────────────────────────────────────────────────────
import { ThemeProvider } from './hooks/useTheme';       // Dark/light mode management
import { ToastProvider } from './hooks/useToast';       // Toast notification system
import { AppProvider } from './hooks/useAppContext';    // Global app state (resume, JD, etc.)
import { AuthProvider } from './hooks/useAuth';         // Supabase authentication state

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// Catches React errors and prevents full app crashes
// ─────────────────────────────────────────────────────────────────────────────
import { PageErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT COMPONENTS
// Persistent UI elements that appear on every page
// ─────────────────────────────────────────────────────────────────────────────
import Header from './components/Header';               // Navigation bar with menus
import Footer from './components/Footer';               // Footer with links
import CommandPalette from './components/CommandPalette'; // Cmd+K quick navigation

// ─────────────────────────────────────────────────────────────────────────────
// CORE PAGES
// Main entry points and user profile management
// ─────────────────────────────────────────────────────────────────────────────
import HomePage from './pages/HomePage';                // Landing page with file uploads
import DashboardPage from './pages/DashboardPage';      // User dashboard with stats
import WelcomePage from './pages/WelcomePage';          // First-time user onboarding
import UserProfilePage from './pages/UserProfilePage';  // Resume and background storage

// ─────────────────────────────────────────────────────────────────────────────
// AI SKILLS PAGES
// The 16 built-in AI skills for job seekers
// ─────────────────────────────────────────────────────────────────────────────
import BrowseSkillsPage from './pages/BrowseSkillsPage';  // Grid view of all skills
import SkillRunnerPage from './pages/SkillRunnerPage';    // Execute a specific skill
import RoleTemplatesPage from './pages/RoleTemplatesPage'; // Pre-configured role templates
import MySkillsPage from './pages/MySkillsPage';          // User's saved/favorite skills
import SkillLibraryPage from './pages/SkillLibraryPage';  // Unified skill library with filtering
import LibrarySkillRunnerPage from './pages/LibrarySkillRunnerPage'; // Run skills from library
import SkillQuizPage from './pages/SkillQuizPage';        // Skill discovery survey

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM SKILL GENERATION
// Dynamic skill creation based on job description analysis
// ─────────────────────────────────────────────────────────────────────────────
import AnalyzeRolePage from './pages/AnalyzeRolePage';           // Analyze a job description
import WorkspacePage from './pages/WorkspacePage';               // View workspace with recommendations
import BuildSkillsPage from './pages/BuildSkillsPage';           // Build custom skills from recommendations
import DynamicSkillRunnerPage from './pages/DynamicSkillRunnerPage'; // Run user-created skills

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY FEATURES
// Supabase-powered skill sharing and discovery
// ─────────────────────────────────────────────────────────────────────────────
import CommunitySkillsPage from './pages/CommunitySkillsPage';       // Browse community skills
import CommunitySkillRunnerPage from './pages/CommunitySkillRunnerPage'; // Run a community skill
import ImportSkillPage from './pages/ImportSkillPage';               // Import skill from JSON

// ─────────────────────────────────────────────────────────────────────────────
// BATCH PROCESSING & EXPORT
// Tools for bulk operations and data export
// ─────────────────────────────────────────────────────────────────────────────
import BatchProcessingPage from './pages/BatchProcessingPage';   // Run skills on CSV data
import SkillExportPage from './pages/SkillExportPage';           // Export skill prompts to CSV/TXT

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOWS
// Multi-step automated sequences that chain skills together
// ─────────────────────────────────────────────────────────────────────────────
import WorkflowsPage from './pages/WorkflowsPage';               // Browse all workflows by category
import WorkflowRunnerPage from './pages/WorkflowRunnerPage';     // Execute multi-step workflows
import BatchRunnerPage from './pages/BatchRunnerPage';           // Batch workflow execution

// ─────────────────────────────────────────────────────────────────────────────
// JOB SEARCH TOOLS
// Utilities to support the job search process
// ─────────────────────────────────────────────────────────────────────────────
import JobTrackerPage from './pages/JobTrackerPage';             // Track job applications
import InterviewBankPage from './pages/InterviewBankPage';       // Store interview Q&A
import SalaryCalculatorPage from './pages/SalaryCalculatorPage'; // Calculate compensation
import NetworkingTemplatesPage from './pages/NetworkingTemplatesPage'; // Outreach templates
import CompanyNotesPage from './pages/CompanyNotesPage';         // Company research notes
import AchievementsPage from './pages/AchievementsPage';         // Gamification & badges
import SkillsGapPage from './pages/SkillsGapPage';               // Skills gap analysis
import ProgressReportPage from './pages/ProgressReportPage';     // Job search progress
import MockInterviewPage from './pages/MockInterviewPage';       // Practice interviews
import FollowUpRemindersPage from './pages/FollowUpRemindersPage'; // Follow-up scheduling
import AutoFillVaultPage from './pages/AutoFillVaultPage';       // Store common form answers
import ReferralNetworkPage from './pages/ReferralNetworkPage';   // Track referral contacts
import MarketInsightsPage from './pages/MarketInsightsPage';     // Job market data
import DailyPlannerPage from './pages/DailyPlannerPage';         // Daily task planning

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY PAGES
// Settings, configuration, and help
// ─────────────────────────────────────────────────────────────────────────────
import ApiKeyInstructionsPage from './pages/ApiKeyInstructionsPage'; // API key setup guide
import PlatformKeysSetupPage from './pages/PlatformKeysSetupPage';   // Platform keys admin setup
import SettingsPage from './pages/SettingsPage';                     // App settings
import PricingPage from './pages/PricingPage';                       // Pricing information
import AdminPage from './pages/AdminPage';                           // Admin control panel
import DevPlaygroundPage from './pages/DevPlaygroundPage';           // Developer test playground
import AccountPage from './pages/AccountPage';                       // User account & credits
import AdminImprovementsPage from './pages/AdminImprovementsPage'; // Skill improvement review
import AuthCallbackPage from './pages/AuthCallbackPage';           // OAuth callback handler
import ClientPortalPage from './pages/ClientPortalPage';           // B2B client marketing portal
import { AuthGate } from './components/AuthGate';                  // Login gate with onboarding

// ─────────────────────────────────────────────────────────────────────────────
// AGENTIC LAB (Beta — admin only)
// Isolated experiment for the Business OS / DAG / agentic workflow direction.
// Existing workflow product is unaffected; gated by useAuth().isAdmin.
// ─────────────────────────────────────────────────────────────────────────────
import AgenticHomePage from './pages/agentic/AgenticHomePage';
import WorkflowComparePage from './pages/agentic/WorkflowComparePage';
import AgenticRunnerPage from './pages/agentic/AgenticRunnerPage';
import SideBySideRunnerPage from './pages/agentic/SideBySideRunnerPage';
import ControlTowerPage from './pages/agentic/ControlTowerPage';
import EntityInspectorPage from './pages/agentic/EntityInspectorPage';
import ApprovalsPage from './pages/agentic/ApprovalsPage';
import AgentConsolePage from './pages/agentic/AgentConsolePage';
import { useAuth } from './hooks/useAuth';

/**
 * AdminOnlyRoute — renders children only for admins. Non-admins get a 404-style
 * fallback so the experiment stays invisible to the rest of the user base.
 */
const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-muted-foreground">The page you’re looking for doesn’t exist.</p>
      </div>
    );
  }
  return <>{children}</>;
};

/**
 * Main App Component
 *
 * Renders the entire application with proper provider nesting and routing.
 * The provider order matters - outer providers are available to inner ones.
 */
function App() {
  return (
    // AuthProvider: Manages Supabase authentication state
    // Must be outermost so auth state is available everywhere
    <AuthProvider>
      {/* AppProvider: Global state for resume text, job description, selected API */}
      <AppProvider>
        {/* HashRouter: Client-side routing using URL hash fragments */}
        <Router>
          {/* ThemeProvider: Manages dark/light mode with localStorage persistence */}
          <ThemeProvider>
            {/* ToastProvider: Global toast notification system */}
            <ToastProvider>
              {/* AuthGate: Shows onboarding wizard for new logged-in users */}
              <AuthGate allowAnonymous={true}>
              {/* PageErrorBoundary: Catches React errors and displays fallback UI */}
              <PageErrorBoundary>
                {/* Main app container with full viewport height and flex layout */}
                <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
                  {/* Sticky header with navigation */}
                  <Header />

                {/* Main content area - grows to fill available space */}
                <main className="flex-1">
                  <Routes>
                    {/* ═══════════════════════════════════════════════════════
                        HOME & CORE PAGES
                        Primary navigation destinations
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/" element={<RouteErrorBoundary pageName="Home"><HomePage /></RouteErrorBoundary>} />
                    <Route path="/dashboard" element={<RouteErrorBoundary pageName="Dashboard"><DashboardPage /></RouteErrorBoundary>} />
                    <Route path="/welcome" element={<RouteErrorBoundary pageName="Welcome"><WelcomePage /></RouteErrorBoundary>} />
                    <Route path="/profile" element={<RouteErrorBoundary pageName="Profile"><UserProfilePage /></RouteErrorBoundary>} />

                    {/* Auth callback for OAuth redirect */}
                    <Route path="/auth/callback" element={<RouteErrorBoundary pageName="Auth"><AuthCallbackPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        ROLE TEMPLATES
                        Pre-configured skill sets for different job roles
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/role-templates" element={<RouteErrorBoundary pageName="Role Templates"><RoleTemplatesPage /></RouteErrorBoundary>} />
                    <Route path="/my-skills" element={<RouteErrorBoundary pageName="My Skills"><MySkillsPage /></RouteErrorBoundary>} />
                    <Route path="/library" element={<RouteErrorBoundary pageName="Skill Library"><SkillLibraryPage /></RouteErrorBoundary>} />
                    <Route path="/library/skill/:skillId" element={<RouteErrorBoundary pageName="Skill Runner"><LibrarySkillRunnerPage /></RouteErrorBoundary>} />
                    <Route path="/library-skill-runner" element={<RouteErrorBoundary pageName="Skill Runner"><LibrarySkillRunnerPage /></RouteErrorBoundary>} />
                    <Route path="/discover" element={<RouteErrorBoundary pageName="Skill Quiz"><SkillQuizPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        STATIC AI SKILLS (16 Built-in Skills)
                        Pre-defined skills for job applicants
                        - /skills: Browse all available skills
                        - /skill/:skillId: Run a specific skill (e.g., /skill/resume-customizer)
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/skills" element={<RouteErrorBoundary pageName="Browse Skills"><BrowseSkillsPage /></RouteErrorBoundary>} />
                    <Route path="/skill/:skillId" element={<RouteErrorBoundary pageName="Skill Runner"><SkillRunnerPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        DYNAMIC SKILL GENERATION
                        Create custom AI skills by analyzing job descriptions
                        - /analyze: Upload JD and get AI-generated skill recommendations
                        - /workspace/:id: View analysis results and select skills to build
                        - /workspace/:id/build: Configure and generate selected skills
                        - /workspace/:id/skill/:id: Run a custom-built skill
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/analyze" element={<RouteErrorBoundary pageName="Analyze Role"><AnalyzeRolePage /></RouteErrorBoundary>} />
                    <Route path="/workspace/:workspaceId" element={<RouteErrorBoundary pageName="Workspace"><WorkspacePage /></RouteErrorBoundary>} />
                    <Route path="/workspace/:workspaceId/build" element={<RouteErrorBoundary pageName="Build Skills"><BuildSkillsPage /></RouteErrorBoundary>} />
                    <Route path="/workspace/:workspaceId/skill/:skillId" element={<RouteErrorBoundary pageName="Dynamic Skill"><DynamicSkillRunnerPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        COMMUNITY FEATURES (Supabase Backend)
                        Share and discover community-created skills
                        - /community: Browse public skills from other users
                        - /community/import: Import a skill from JSON
                        - /community-skill-runner: Execute a community skill
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/community" element={<RouteErrorBoundary pageName="Community Skills"><CommunitySkillsPage /></RouteErrorBoundary>} />
                    <Route path="/community/import" element={<RouteErrorBoundary pageName="Import Skill"><ImportSkillPage /></RouteErrorBoundary>} />
                    <Route path="/community-skill-runner" element={<RouteErrorBoundary pageName="Community Skill"><CommunitySkillRunnerPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        BATCH PROCESSING & EXPORT
                        Bulk operations for power users
                        - /batch: Run any skill on multiple CSV rows
                        - /export-skills: Download skill prompts as CSV/TXT
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/batch" element={<RouteErrorBoundary pageName="Batch Processing"><BatchProcessingPage /></RouteErrorBoundary>} />
                    <Route path="/export-skills" element={<RouteErrorBoundary pageName="Export Skills"><SkillExportPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        WORKFLOWS
                        Multi-step automated sequences that chain skills
                        - /workflows: Browse all workflows by category
                        - /workflow/:id: Run a pre-built workflow (job-application, interview-prep, post-interview)
                        - /workflow/:id/batch: Batch execution with multiple input sets
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/workflows" element={<RouteErrorBoundary pageName="Workflows"><WorkflowsPage /></RouteErrorBoundary>} />
                    <Route path="/workflow/:workflowId" element={<RouteErrorBoundary pageName="Workflow Runner"><WorkflowRunnerPage /></RouteErrorBoundary>} />
                    <Route path="/workflow/:workflowId/batch" element={<RouteErrorBoundary pageName="Batch Runner"><BatchRunnerPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        JOB SEARCH TOOLS
                        Comprehensive toolkit for job seekers
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/job-tracker" element={<RouteErrorBoundary pageName="Job Tracker"><JobTrackerPage /></RouteErrorBoundary>} />
                    <Route path="/interview-bank" element={<RouteErrorBoundary pageName="Interview Bank"><InterviewBankPage /></RouteErrorBoundary>} />
                    <Route path="/salary-calculator" element={<RouteErrorBoundary pageName="Salary Calculator"><SalaryCalculatorPage /></RouteErrorBoundary>} />
                    <Route path="/networking" element={<RouteErrorBoundary pageName="Networking"><NetworkingTemplatesPage /></RouteErrorBoundary>} />
                    <Route path="/company-notes" element={<RouteErrorBoundary pageName="Company Notes"><CompanyNotesPage /></RouteErrorBoundary>} />
                    <Route path="/skills-gap" element={<RouteErrorBoundary pageName="Skills Gap"><SkillsGapPage /></RouteErrorBoundary>} />
                    <Route path="/progress" element={<RouteErrorBoundary pageName="Progress Report"><ProgressReportPage /></RouteErrorBoundary>} />
                    <Route path="/achievements" element={<RouteErrorBoundary pageName="Achievements"><AchievementsPage /></RouteErrorBoundary>} />
                    <Route path="/mock-interview" element={<RouteErrorBoundary pageName="Mock Interview"><MockInterviewPage /></RouteErrorBoundary>} />
                    <Route path="/follow-ups" element={<RouteErrorBoundary pageName="Follow-ups"><FollowUpRemindersPage /></RouteErrorBoundary>} />
                    <Route path="/autofill-vault" element={<RouteErrorBoundary pageName="AutoFill Vault"><AutoFillVaultPage /></RouteErrorBoundary>} />
                    <Route path="/referral-network" element={<RouteErrorBoundary pageName="Referral Network"><ReferralNetworkPage /></RouteErrorBoundary>} />
                    <Route path="/market-insights" element={<RouteErrorBoundary pageName="Market Insights"><MarketInsightsPage /></RouteErrorBoundary>} />
                    <Route path="/daily-planner" element={<RouteErrorBoundary pageName="Daily Planner"><DailyPlannerPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        UTILITY PAGES
                        Configuration and help resources
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/api-keys" element={<RouteErrorBoundary pageName="API Keys"><ApiKeyInstructionsPage /></RouteErrorBoundary>} />
                    <Route path="/docs/platform-keys-setup" element={<RouteErrorBoundary pageName="Platform Keys Setup"><PlatformKeysSetupPage /></RouteErrorBoundary>} />
                    <Route path="/settings" element={<RouteErrorBoundary pageName="Settings"><SettingsPage /></RouteErrorBoundary>} />
                    <Route path="/pricing" element={<RouteErrorBoundary pageName="Pricing"><PricingPage /></RouteErrorBoundary>} />
                    <Route path="/account" element={<RouteErrorBoundary pageName="Account"><AccountPage /></RouteErrorBoundary>} />
                    <Route path="/admin" element={<RouteErrorBoundary pageName="Admin"><AdminPage /></RouteErrorBoundary>} />
                    <Route path="/admin/improvements" element={<RouteErrorBoundary pageName="Admin Improvements"><AdminImprovementsPage /></RouteErrorBoundary>} />
                    <Route path="/dev/playground" element={<RouteErrorBoundary pageName="Dev Playground"><DevPlaygroundPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        CLIENT PORTAL
                        Marketing-friendly pages for B2B client outreach
                        - /portal/:slug: Dedicated portal for each client
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/portal/:slug" element={<RouteErrorBoundary pageName="Client Portal"><ClientPortalPage /></RouteErrorBoundary>} />

                    {/* ═══════════════════════════════════════════════════════
                        AGENTIC LAB (Beta — admin only)
                        Isolated experiment for the Business OS / DAG model.
                        Existing workflow routes above are untouched.
                    ═══════════════════════════════════════════════════════ */}
                    <Route path="/agentic" element={<RouteErrorBoundary pageName="Agentic Lab"><AdminOnlyRoute><AgenticHomePage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/compare" element={<RouteErrorBoundary pageName="Workflow Compare"><AdminOnlyRoute><WorkflowComparePage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/compare/:workflowId" element={<RouteErrorBoundary pageName="Workflow Compare"><AdminOnlyRoute><WorkflowComparePage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/run/:workflowId" element={<RouteErrorBoundary pageName="Agentic Runner"><AdminOnlyRoute><AgenticRunnerPage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/side-by-side/:workflowId" element={<RouteErrorBoundary pageName="Shadow Run"><AdminOnlyRoute><SideBySideRunnerPage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/control-tower" element={<RouteErrorBoundary pageName="Control Tower"><AdminOnlyRoute><ControlTowerPage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/entities" element={<RouteErrorBoundary pageName="Entity Inspector"><AdminOnlyRoute><EntityInspectorPage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/approvals" element={<RouteErrorBoundary pageName="Approvals"><AdminOnlyRoute><ApprovalsPage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/agents" element={<RouteErrorBoundary pageName="Agents"><AdminOnlyRoute><AgentConsolePage /></AdminOnlyRoute></RouteErrorBoundary>} />
                    <Route path="/agentic/agents/:agentId" element={<RouteErrorBoundary pageName="Agent Console"><AdminOnlyRoute><AgentConsolePage /></AdminOnlyRoute></RouteErrorBoundary>} />
                  </Routes>
                </main>

                {/* Footer with links and copyright */}
                <Footer />

                {/* Command palette overlay (Cmd+K to open) */}
                <CommandPalette />
              </div>
              </PageErrorBoundary>
              </AuthGate>
            </ToastProvider>
          </ThemeProvider>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
