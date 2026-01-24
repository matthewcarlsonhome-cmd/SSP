
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Briefcase, Users, LogIn, LogOut, Loader2, ChevronDown, LayoutDashboard, Package, Menu, X, Settings, FileSpreadsheet, Trophy, Lock, User, Wand2, Download, Shield, BookOpen, Layers, Import, FolderOpen, CreditCard } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { useToast } from '../hooks/useToast.tsx';
import { Button } from './ui/Button.tsx';

const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { user, loading, isConfigured, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { addToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowToolsMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menus on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowToolsMenu(false);
      setShowUserMenu(false);
      setMobileMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isActive = (path: string) => location.pathname === path;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      addToast('Failed to sign in with Google', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
      addToast('Signed out successfully', 'success');
    } catch (err) {
      addToast('Failed to sign out', 'error');
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">SkillEngine</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {/* Core Navigation - 4 primary destinations */}
            <Link to="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/library">
              <Button
                variant={isActive('/library') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Skill Library
              </Button>
            </Link>
            <Link to="/workflows">
              <Button
                variant={isActive('/workflows') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Workflows
              </Button>
            </Link>

            {/* More Dropdown - Consolidated menu for secondary features */}
            <div className="relative" ref={toolsMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                aria-expanded={showToolsMenu}
                aria-haspopup="true"
                aria-label="More navigation options"
              >
                More
                <ChevronDown className={`h-3 w-3 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
              </Button>

              {showToolsMenu && (
                <nav
                  className="absolute left-0 mt-2 w-80 rounded-lg border bg-card shadow-lg z-50 max-h-[80vh] overflow-y-auto"
                  role="menu"
                  aria-label="More options menu"
                >
                    <div className="p-2">
                      {/* Create & Customize */}
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Create & Customize</p>
                      <Link to="/role-templates" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <span className="text-sm font-medium">Role Templates</span>
                            <p className="text-xs text-muted-foreground">Pre-built skill sets for roles</p>
                          </div>
                        </div>
                      </Link>
                      <Link to="/analyze" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Wand2 className="h-4 w-4 text-purple-500" />
                          <div>
                            <span className="text-sm font-medium">Custom Skills</span>
                            <p className="text-xs text-muted-foreground">Create your own AI skills</p>
                          </div>
                        </div>
                      </Link>
                      <Link to="/community" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <span className="text-sm font-medium">Community</span>
                            <p className="text-xs text-muted-foreground">Share & discover skills</p>
                          </div>
                        </div>
                      </Link>

                      {/* My Content */}
                      <div className="border-t my-2" />
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">My Content</p>
                      <Link to="/my-skills" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          <div>
                            <span className="text-sm font-medium">My Skills</span>
                            <p className="text-xs text-muted-foreground">Your saved & created skills</p>
                          </div>
                        </div>
                      </Link>
                      <Link to="/autofill-vault" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Lock className="h-4 w-4 text-emerald-500" />
                          <div>
                            <span className="text-sm font-medium">Auto-Fill Vault</span>
                            <p className="text-xs text-muted-foreground">Store reusable data snippets</p>
                          </div>
                        </div>
                      </Link>

                      {/* Power Tools */}
                      <div className="border-t my-2" />
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Power Tools</p>
                      <Link to="/batch" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="text-sm font-medium">Batch Processing</span>
                            <p className="text-xs text-muted-foreground">Run skills on multiple items</p>
                          </div>
                        </div>
                      </Link>
                      <Link to="/community/import" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Import className="h-4 w-4 text-cyan-500" />
                          <div>
                            <span className="text-sm font-medium">Import Skills</span>
                            <p className="text-xs text-muted-foreground">Import from JSON or URL</p>
                          </div>
                        </div>
                      </Link>
                      <Link to="/export-skills" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Download className="h-4 w-4 text-orange-500" />
                          <div>
                            <span className="text-sm font-medium">Export Skills</span>
                            <p className="text-xs text-muted-foreground">Download skills as JSON</p>
                          </div>
                        </div>
                      </Link>

                      {/* Account & More */}
                      <div className="border-t my-2" />
                      <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account & More</p>
                      <Link to="/pricing" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <CreditCard className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Pricing & Plans</span>
                        </div>
                      </Link>
                      <Link to="/achievements" onClick={() => setShowToolsMenu(false)}>
                        <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Achievements</span>
                        </div>
                      </Link>

                      {/* Admin - Only visible to logged-in admins */}
                      {isAdmin && (
                        <>
                          <div className="border-t my-2" />
                          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin</p>
                          <Link to="/admin" onClick={() => setShowToolsMenu(false)}>
                            <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted transition-colors">
                              <Shield className="h-4 w-4 text-amber-500" />
                              <span className="text-sm">Control Panel</span>
                            </div>
                          </Link>
                        </>
                      )}
                    </div>
                </nav>
              )}
            </div>

            {/* Settings Icon */}
            <Link to="/settings">
              <Button
                variant={isActive('/settings') ? 'secondary' : 'ghost'}
                size="icon"
                className="ml-1"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Auth Section */}
          {isConfigured && (
            <>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors"
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                    aria-label="User menu"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt={`${user.user_metadata?.full_name || 'User'} avatar`}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium" aria-hidden="true">
                          {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg z-50"
                      role="menu"
                      aria-label="User options"
                    >
                        <div className="p-3 border-b">
                          <p className="font-medium text-sm truncate">
                            {user.user_metadata?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="p-1">
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                          >
                            <User className="h-4 w-4" />
                            My Profile
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setShowUserMenu(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                          >
                            <Settings className="h-4 w-4" />
                            Settings
                          </Link>
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setShowUserMenu(false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
                            >
                              <Shield className="h-4 w-4 text-amber-500" />
                              Admin Panel
                            </Link>
                          )}
                          <div className="border-t my-1" />
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors text-left"
                            role="menuitem"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="gap-2"
                >
                  {isSigningIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Sign in
                </Button>
              )}
            </>
          )}

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu - Fixed Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          {/* Menu Panel */}
          <div
            ref={mobileMenuRef}
            className="fixed top-16 right-0 bottom-0 w-[85%] max-w-sm bg-background border-l shadow-xl z-50 md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <nav className="p-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {/* Core Navigation */}
            <Link to="/dashboard">
              <Button
                variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/library">
              <Button
                variant={isActive('/library') ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Skill Library
              </Button>
            </Link>
            <Link to="/workflows">
              <Button
                variant={isActive('/workflows') ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
              >
                <Layers className="h-4 w-4" />
                Workflows
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant={isActive('/settings') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>

            {/* Create & Customize */}
            <div className="border-t my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Create & Customize</p>
            <Link to="/role-templates">
              <Button variant={isActive('/role-templates') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Package className="h-4 w-4 text-primary" />
                Role Templates
              </Button>
            </Link>
            <Link to="/analyze">
              <Button variant={isActive('/analyze') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Wand2 className="h-4 w-4 text-purple-500" />
                Custom Skills
              </Button>
            </Link>
            <Link to="/community">
              <Button variant={isActive('/community') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Community
              </Button>
            </Link>

            {/* My Content */}
            <div className="border-t my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">My Content</p>
            <Link to="/my-skills">
              <Button variant={isActive('/my-skills') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <FolderOpen className="h-4 w-4 text-blue-500" />
                My Skills
              </Button>
            </Link>
            <Link to="/autofill-vault">
              <Button variant={isActive('/autofill-vault') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Lock className="h-4 w-4 text-emerald-500" />
                Auto-Fill Vault
              </Button>
            </Link>

            {/* Power Tools */}
            <div className="border-t my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Power Tools</p>
            <Link to="/batch">
              <Button variant={isActive('/batch') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                Batch Processing
              </Button>
            </Link>
            <Link to="/community/import">
              <Button variant={isActive('/community/import') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Import className="h-4 w-4 text-cyan-500" />
                Import Skills
              </Button>
            </Link>
            <Link to="/export-skills">
              <Button variant={isActive('/export-skills') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Download className="h-4 w-4 text-orange-500" />
                Export Skills
              </Button>
            </Link>

            {/* Account & More */}
            <div className="border-t my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Account & More</p>
            <Link to="/pricing">
              <Button variant={isActive('/pricing') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                Pricing & Plans
              </Button>
            </Link>
            <Link to="/achievements">
              <Button variant={isActive('/achievements') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Achievements
              </Button>
            </Link>

            {/* Admin - Only visible to logged-in admins */}
            {isAdmin && (
              <>
                <div className="border-t my-2" />
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Admin</p>
                <Link to="/admin" onClick={closeMobileMenu}>
                  <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    Control Panel
                  </Button>
                </Link>
              </>
            )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
