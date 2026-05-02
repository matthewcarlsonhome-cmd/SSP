// Settings Page - API keys and user preferences

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../lib/logger';
import {
  saveApiKey,
  getApiKey,
  clearApiKey,
  clearAllApiKeys,
  getLastUpdated,
} from '../lib/apiKeyStorage';
import {
  getEmailPreference,
  updateMarketingOptIn,
} from '../lib/emailSegmentation/storage';
import {
  Settings,
  Key,
  Palette,
  User,
  Shield,
  Trash2,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  Save,
  AlertTriangle,
  Download,
  Upload,
  Mail,
  Bell,
} from 'lucide-react';
import { db } from '../lib/storage/indexeddb';
import { downloadBundleAsJson } from '../lib/skillExport';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, isConfigured } = useAuth();

  // API Keys
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [chatgptKey, setChatgptKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showChatgptKey, setShowChatgptKey] = useState(false);
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasChatgptKey, setHasChatgptKey] = useState(false);
  const [hasPerplexityKey, setHasPerplexityKey] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Data
  const [skillCount, setSkillCount] = useState(0);
  const [outputCount, setOutputCount] = useState(0);

  // Email preferences
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load API key status
    const gemini = await getApiKey('gemini');
    const claude = await getApiKey('claude');
    const chatgpt = await getApiKey('chatgpt');
    const perplexity = await getApiKey('perplexity');
    setHasGeminiKey(!!gemini);
    setHasClaudeKey(!!claude);
    setHasChatgptKey(!!chatgpt);
    setHasPerplexityKey(!!perplexity);
    setLastUpdated(getLastUpdated());

    // Load email preferences
    if (user?.id) {
      try {
        const emailPref = await getEmailPreference(user.id);
        if (emailPref) {
          setMarketingOptIn(emailPref.marketingEmailOptIn);
        }
      } catch (e) {
        logger.error('Failed to load email preferences', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Load data counts
    try {
      await db.init();
      const skills = await db.getAllDynamicSkills();
      const outputs = await db.getAllSavedOutputs();
      setSkillCount(skills.length);
      setOutputCount(outputs.length);
    } catch (e) {
      logger.error('Failed to load data counts', { error: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSaveGeminiKey = async () => {
    if (geminiKey.trim()) {
      await saveApiKey('gemini', geminiKey.trim());
      setHasGeminiKey(true);
      setGeminiKey('');
      addToast('Gemini API key saved', 'success');
    }
  };

  const handleSaveClaudeKey = async () => {
    if (claudeKey.trim()) {
      await saveApiKey('claude', claudeKey.trim());
      setHasClaudeKey(true);
      setClaudeKey('');
      addToast('Claude API key saved', 'success');
    }
  };

  const handleSaveChatgptKey = async () => {
    if (chatgptKey.trim()) {
      await saveApiKey('chatgpt', chatgptKey.trim());
      setHasChatgptKey(true);
      setChatgptKey('');
      addToast('ChatGPT API key saved', 'success');
    }
  };

  const handleSavePerplexityKey = async () => {
    if (perplexityKey.trim()) {
      await saveApiKey('perplexity', perplexityKey.trim());
      setHasPerplexityKey(true);
      setPerplexityKey('');
      addToast('Perplexity API key saved', 'success');
    }
  };

  const handleClearGeminiKey = async () => {
    await clearApiKey('gemini');
    setHasGeminiKey(false);
    addToast('Gemini API key removed', 'success');
  };

  const handleClearClaudeKey = async () => {
    await clearApiKey('claude');
    setHasClaudeKey(false);
    addToast('Claude API key removed', 'success');
  };

  const handleClearChatgptKey = async () => {
    await clearApiKey('chatgpt');
    setHasChatgptKey(false);
    addToast('ChatGPT API key removed', 'success');
  };

  const handleClearPerplexityKey = async () => {
    await clearApiKey('perplexity');
    setHasPerplexityKey(false);
    addToast('Perplexity API key removed', 'success');
  };

  const handleClearAllKeys = () => {
    if (confirm('Are you sure you want to remove all API keys?')) {
      clearAllApiKeys();
      setHasGeminiKey(false);
      setHasClaudeKey(false);
      setHasChatgptKey(false);
      setHasPerplexityKey(false);
      addToast('All API keys removed', 'success');
    }
  };

  const handleToggleMarketingOptIn = async () => {
    if (!user?.id || !user?.email) {
      addToast('Please sign in to manage email preferences', 'error');
      return;
    }

    setOptInLoading(true);
    try {
      const newValue = !marketingOptIn;
      await updateMarketingOptIn(user.id, user.email, newValue);
      setMarketingOptIn(newValue);
      addToast(
        newValue
          ? 'You are now subscribed to product updates'
          : 'You have unsubscribed from product updates',
        'success'
      );
    } catch (e) {
      addToast('Failed to update email preferences', 'error');
    } finally {
      setOptInLoading(false);
    }
  };

  const handleExportSkills = async () => {
    try {
      await db.init();
      const skills = await db.getAllDynamicSkills();
      if (skills.length === 0) {
        addToast('No skills to export', 'error');
        return;
      }
      downloadBundleAsJson(skills, 'my-skillengine-skills');
      addToast(`Exported ${skills.length} skills`, 'success');
    } catch (e) {
      addToast('Failed to export skills', 'error');
    }
  };

  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
      try {
        // Clear IndexedDB
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        // Clear localStorage
        localStorage.clear();
        addToast('All data cleared', 'success');
        navigate('/');
      } catch (e) {
        addToast('Failed to clear data', 'error');
      }
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your API keys and preferences</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* API Keys Section */}
        <section className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">API Keys</h2>
          </div>

          <div className="space-y-6">
            {/* Gemini Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Google Gemini</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasGeminiKey ? 'Key configured' : 'Not configured'}
                  </p>
                </div>
                {hasGeminiKey && (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <Check className="h-4 w-4" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder={hasGeminiKey ? '••••••••••••••••' : 'Enter Gemini API key'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {geminiKey ? (
                  <Button onClick={handleSaveGeminiKey}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                ) : hasGeminiKey ? (
                  <Button variant="destructive" onClick={handleClearGeminiKey}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Get a free Gemini API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Claude Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Anthropic Claude</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasClaudeKey ? 'Key configured' : 'Not configured'}
                  </p>
                </div>
                {hasClaudeKey && (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <Check className="h-4 w-4" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showClaudeKey ? 'text' : 'password'}
                    placeholder={hasClaudeKey ? '••••••••••••••••' : 'Enter Claude API key'}
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowClaudeKey(!showClaudeKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {claudeKey ? (
                  <Button onClick={handleSaveClaudeKey}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                ) : hasClaudeKey ? (
                  <Button variant="destructive" onClick={handleClearClaudeKey}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Get a Claude API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* ChatGPT Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">OpenAI ChatGPT</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasChatgptKey ? 'Key configured' : 'Not configured'}
                  </p>
                </div>
                {hasChatgptKey && (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <Check className="h-4 w-4" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showChatgptKey ? 'text' : 'password'}
                    placeholder={hasChatgptKey ? '••••••••••••••••' : 'Enter ChatGPT API key'}
                    value={chatgptKey}
                    onChange={(e) => setChatgptKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowChatgptKey(!showChatgptKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showChatgptKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {chatgptKey ? (
                  <Button onClick={handleSaveChatgptKey}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                ) : hasChatgptKey ? (
                  <Button variant="destructive" onClick={handleClearChatgptKey}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Get a ChatGPT API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Perplexity Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Perplexity Sonar</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasPerplexityKey ? 'Key configured' : 'Not configured'}
                  </p>
                </div>
                {hasPerplexityKey && (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <Check className="h-4 w-4" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPerplexityKey ? 'text' : 'password'}
                    placeholder={hasPerplexityKey ? '****************' : 'Enter Perplexity API key'}
                    value={perplexityKey}
                    onChange={(e) => setPerplexityKey(e.target.value)}
                  />
                  <button
                    onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPerplexityKey ? 'Hide Perplexity API key' : 'Show Perplexity API key'}
                  >
                    {showPerplexityKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {perplexityKey ? (
                  <Button onClick={handleSavePerplexityKey}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                ) : hasPerplexityKey ? (
                  <Button variant="destructive" onClick={handleClearPerplexityKey}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <a
                href="https://docs.perplexity.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Get a Perplexity API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </section>

        {/* Appearance Section */}
        <section className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Appearance</h2>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Theme</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                  theme === 'light' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                  theme === 'dark' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm">Dark</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex-1 p-4 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                  theme === 'system' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm">System</span>
              </button>
            </div>
          </div>
        </section>

        {/* Account Section */}
        {isConfigured && user && (
          <section className="border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>

            <div className="flex items-center gap-4">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-medium">
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium">{user.user_metadata?.full_name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Signed in with Google
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Email Preferences Section */}
        {isConfigured && user && (
          <section className="border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Email Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Product Updates & Tips</p>
                    <p className="text-sm text-muted-foreground">
                      Receive occasional emails about new features, skill recommendations, and career tips.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleMarketingOptIn}
                  disabled={optInLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    marketingOptIn ? 'bg-primary' : 'bg-muted-foreground/30'
                  } ${optInLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      marketingOptIn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {marketingOptIn ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />
                    You're subscribed to product updates
                  </span>
                ) : (
                  'You can opt in at any time to receive product updates.'
                )}
              </p>
            </div>
          </section>
        )}

        {/* Data Management Section */}
        <section className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Data Management</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Your Data</p>
                <p className="text-sm text-muted-foreground">
                  {skillCount} skills, {outputCount} saved outputs
                </p>
              </div>
              <Button variant="outline" onClick={handleExportSkills}>
                <Download className="h-4 w-4 mr-2" />
                Export Skills
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    These actions are irreversible. Please be careful.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllKeys}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Clear All Keys
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearAllData}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
