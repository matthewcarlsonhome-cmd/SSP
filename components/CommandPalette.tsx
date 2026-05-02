/**
 * CommandPalette - Enhanced spotlight-style search (Cmd+K / Ctrl+K)
 *
 * Features:
 * - Keyboard shortcut activation (Cmd+K or Ctrl+K)
 * - Search across skills, pages, and recent items
 * - Keyboard navigation (arrows, enter, escape)
 * - Smooth animations and transitions
 * - Recent searches tracking
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { SKILLS } from '../lib/skills';
import {
  LayoutDashboard,
  Sparkles,
  Package,
  FolderOpen,
  Users,
  FileSpreadsheet,
  Settings,
  Home,
  Search,
  DollarSign,
  Briefcase,
  ArrowRight,
  MessageSquare,
  Calculator,
  Mail,
  Building2,
  Trophy,
  Target,
  BarChart3,
  Bot,
  Bell,
  Lock,
  TrendingUp,
  Calendar,
  User,
  Wand2,
  Command,
  BookOpen,
  Layers,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
  Clock,
} from 'lucide-react';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  action: () => void;
  keywords: string[];
  type?: 'page' | 'skill';
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT HINT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const CommandPaletteHint: React.FC<{ className?: string }> = ({ className }) => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('openCommandPalette'));
  };

  return (
    <button
      onClick={openPalette}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted transition-all duration-200 text-xs text-muted-foreground hover:text-foreground group ${className || ''}`}
    >
      <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="ml-1 px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono shadow-sm">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  );
};

const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 100);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build skills commands from SKILLS registry
  const skillCommands = useMemo<Command[]>(() => {
    return Object.values(SKILLS).map((skill) => ({
      id: `skill-${skill.id}`,
      name: skill.name,
      description: skill.description,
      icon: Sparkles,
      action: () => navigate(`/skill/${skill.id}`),
      keywords: [skill.category, ...skill.name.toLowerCase().split(' ')],
      type: 'skill' as const,
    }));
  }, [navigate]);

  const commands: Command[] = [
    {
      id: 'profile',
      name: 'My Profile',
      description: 'Manage your resume and background info',
      icon: User,
      action: () => navigate('/profile'),
      keywords: ['profile', 'resume', 'background', 'info', 'personal', 'me'],
      type: 'page',
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'View your saved outputs and history',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
      keywords: ['home', 'saved', 'history', 'outputs'],
    },
    {
      id: 'llm-visibility-audit',
      name: 'LLM Visibility Audit',
      description: 'Audit local business visibility across AI answers',
      icon: BarChart3,
      action: () => navigate('/llm-visibility-audit'),
      keywords: ['llm', 'visibility', 'audit', 'local', 'business', 'seo', 'ai answers', 'perplexity'],
    },
    {
      id: 'skills',
      name: 'AI Skills',
      description: 'Browse AI-powered job search tools',
      icon: Sparkles,
      action: () => navigate('/skills'),
      keywords: ['skills', 'tools', 'resume', 'interview', 'cover letter', 'ai'],
    },
    {
      id: 'roles',
      name: 'Role Templates',
      description: 'Install skill bundles for your profession',
      icon: Package,
      action: () => navigate('/role-templates'),
      keywords: ['roles', 'templates', 'profession', 'career'],
    },
    {
      id: 'analyze',
      name: 'Custom Skills',
      description: 'Generate custom skills from job postings',
      icon: Wand2,
      action: () => navigate('/analyze'),
      keywords: ['analyze', 'job', 'posting', 'custom', 'generate', 'create'],
    },
    {
      id: 'community',
      name: 'Community Skills',
      description: 'Discover and share community skills',
      icon: Users,
      action: () => navigate('/community'),
      keywords: ['community', 'share', 'discover', 'social'],
    },
    {
      id: 'batch',
      name: 'Batch Processing',
      description: 'Process multiple items at once',
      icon: FileSpreadsheet,
      action: () => navigate('/batch'),
      keywords: ['batch', 'csv', 'bulk', 'multiple'],
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Manage API keys and preferences',
      icon: Settings,
      action: () => navigate('/settings'),
      keywords: ['settings', 'api', 'keys', 'preferences', 'config'],
    },
    {
      id: 'pricing',
      name: 'Pricing',
      description: 'View pricing plans',
      icon: DollarSign,
      action: () => navigate('/pricing'),
      keywords: ['pricing', 'plans', 'subscription', 'pro'],
    },
    {
      id: 'my-skills',
      name: 'My Skills',
      description: 'View your installed skills',
      icon: Briefcase,
      action: () => navigate('/my-skills'),
      keywords: ['my', 'installed', 'skills', 'custom'],
    },
    {
      id: 'home',
      name: 'Home',
      description: 'Go to homepage',
      icon: Home,
      action: () => navigate('/'),
      keywords: ['home', 'landing', 'start'],
    },
    {
      id: 'job-tracker',
      name: 'Job Tracker',
      description: 'Track your job applications',
      icon: Briefcase,
      action: () => navigate('/job-tracker'),
      keywords: ['job', 'tracker', 'applications', 'track', 'applied'],
    },
    {
      id: 'interview-bank',
      name: 'Interview Questions',
      description: 'Browse interview question bank',
      icon: MessageSquare,
      action: () => navigate('/interview-bank'),
      keywords: ['interview', 'questions', 'practice', 'behavioral'],
    },
    {
      id: 'salary-calculator',
      name: 'Salary Calculator',
      description: 'Calculate and compare salaries',
      icon: Calculator,
      action: () => navigate('/salary-calculator'),
      keywords: ['salary', 'calculator', 'compensation', 'negotiate', 'offer'],
    },
    {
      id: 'networking',
      name: 'Networking Templates',
      description: 'LinkedIn and email templates',
      icon: Mail,
      action: () => navigate('/networking'),
      keywords: ['networking', 'templates', 'linkedin', 'email', 'outreach'],
    },
    {
      id: 'company-notes',
      name: 'Company Notes',
      description: 'Research and track companies',
      icon: Building2,
      action: () => navigate('/company-notes'),
      keywords: ['company', 'notes', 'research', 'track'],
    },
    {
      id: 'skills-gap',
      name: 'Skills Gap Analyzer',
      description: 'Compare your skills to job requirements',
      icon: Target,
      action: () => navigate('/skills-gap'),
      keywords: ['skills', 'gap', 'analyzer', 'compare', 'requirements'],
    },
    {
      id: 'progress',
      name: 'Progress Report',
      description: 'View your weekly job search progress',
      icon: BarChart3,
      action: () => navigate('/progress'),
      keywords: ['progress', 'report', 'weekly', 'stats', 'activity'],
    },
    {
      id: 'achievements',
      name: 'Achievements',
      description: 'View your job search achievements',
      icon: Trophy,
      action: () => navigate('/achievements'),
      keywords: ['achievements', 'badges', 'milestones', 'gamification'],
    },
    {
      id: 'mock-interview',
      name: 'Mock Interview',
      description: 'Practice interviews with AI feedback',
      icon: Bot,
      action: () => navigate('/mock-interview'),
      keywords: ['mock', 'interview', 'practice', 'ai', 'feedback', 'simulator'],
    },
    {
      id: 'follow-ups',
      name: 'Follow-up Reminders',
      description: 'Manage application follow-up reminders',
      icon: Bell,
      action: () => navigate('/follow-ups'),
      keywords: ['follow', 'up', 'reminders', 'notifications', 'schedule'],
    },
    {
      id: 'autofill-vault',
      name: 'Auto-Fill Vault',
      description: 'Store reusable application answers',
      icon: Lock,
      action: () => navigate('/autofill-vault'),
      keywords: ['autofill', 'vault', 'answers', 'store', 'reusable', 'data'],
    },
    {
      id: 'referral-network',
      name: 'Referral Network',
      description: 'Track connections at target companies',
      icon: Users,
      action: () => navigate('/referral-network'),
      keywords: ['referral', 'network', 'connections', 'contacts', 'companies'],
    },
    {
      id: 'market-insights',
      name: 'Market Insights',
      description: 'View job market trends and salary data',
      icon: TrendingUp,
      action: () => navigate('/market-insights'),
      keywords: ['market', 'insights', 'trends', 'salary', 'data', 'analytics'],
    },
    {
      id: 'daily-planner',
      name: 'Daily Planner',
      description: 'Plan your job search activities',
      icon: Calendar,
      action: () => navigate('/daily-planner'),
      keywords: ['daily', 'planner', 'schedule', 'time', 'block', 'activities'],
    },
  ];

  // Merge all commands
  const allCommands = useMemo(() => [...commands, ...skillCommands], [skillCommands]);

  const filteredCommands = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    if (!searchLower) {
      // Show pages first when no search
      return commands.slice(0, 10);
    }

    const filtered = allCommands.filter((cmd) => {
      return (
        cmd.name.toLowerCase().includes(searchLower) ||
        cmd.description.toLowerCase().includes(searchLower) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(searchLower))
      );
    });

    // Sort: exact matches first, then starts with, then contains
    filtered.sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchLower;
      const bExact = b.name.toLowerCase() === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(searchLower);
      const bStarts = b.name.toLowerCase().startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Pages before skills
      if (a.type === 'page' && b.type === 'skill') return -1;
      if (a.type === 'skill' && b.type === 'page') return 1;

      return 0;
    });

    return filtered.slice(0, 15);
  }, [debouncedSearch, allCommands]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
  }, []);

  const executeCommand = useCallback((command: Command) => {
    handleClose();
    command.action();
  }, [handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
        return;
      }

      if (!isOpen) return;

      // Close with Escape
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Navigate with arrow keys
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      // Execute with Enter
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        executeCommand(filteredCommands[selectedIndex]);
        return;
      }
    };

    const handleCustomOpen = () => handleOpen();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openCommandPalette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openCommandPalette', handleCustomOpen);
    };
  }, [isOpen, filteredCommands, selectedIndex, handleOpen, handleClose, executeCommand]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

  return (
    <>
      {/* Backdrop with fade animation */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Palette with slide animation */}
      <div className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl z-50 px-4 animate-in slide-in-from-top-4 fade-in duration-200">
        <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills, pages, or commands..."
              className="flex-1 h-14 bg-transparent outline-none text-base placeholder:text-muted-foreground"
            />
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Commands List */}
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No results for "{search}"</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCommands.map((cmd, index) => {
                  const Icon = cmd.icon;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary-foreground/20'
                          : cmd.type === 'skill' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          isSelected ? '' : cmd.type === 'skill' ? 'text-primary' : ''
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cmd.name}</p>
                        <p className={`text-sm truncate ${
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {cmd.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.type === 'skill' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            Skill
                          </span>
                        )}
                        {isSelected && (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="h-3 w-3" />
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] px-1 py-0.5 rounded bg-muted border">Esc</span>
                <span>Close</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Command className="h-3 w-3" />
              <span>{isMac ? '⌘' : 'Ctrl'}K to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
