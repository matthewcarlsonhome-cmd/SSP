-- Migration 004: Auth profiles and billing/credits system
-- Run this migration via the Supabase SQL editor

-- ─── User Profiles (extends auth.users) ───
-- Automatically created on signup via trigger
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  -- Billing
  credits INTEGER DEFAULT 0 NOT NULL,
  stripe_customer_id TEXT,
  -- Preferences
  preferred_model TEXT DEFAULT 'haiku' CHECK (preferred_model IN ('haiku', 'sonnet')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Credit Transactions (audit trail for credits) ───
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive = purchase/grant, negative = usage
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'grant', 'refund')),
  description TEXT,
  -- For purchases
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  -- For usage
  job_id UUID REFERENCES audit_jobs(id) ON DELETE SET NULL,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Credit Packages (pricing tiers) ───
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL, -- price in cents (USD)
  stripe_price_id TEXT, -- Stripe Price ID for checkout
  popular BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default pricing packages
-- Haiku audit costs ~1 credit, Sonnet audit costs ~5 credits
INSERT INTO credit_packages (name, credits, price_cents, popular) VALUES
  ('Starter', 5, 999, false),       -- $9.99  = 5 credits  ($2.00/credit)
  ('Professional', 15, 2499, true),  -- $24.99 = 15 credits ($1.67/credit)
  ('Agency', 50, 6999, false);       -- $69.99 = 50 credits ($1.40/credit)

-- Add model_used and credits_used to audit_jobs for billing tracking
ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'haiku';
ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;
ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);

-- Update status check constraint to include formatting_report
ALTER TABLE audit_jobs DROP CONSTRAINT IF EXISTS audit_jobs_status_check;
ALTER TABLE audit_jobs ADD CONSTRAINT audit_jobs_status_check CHECK (status IN (
  'pending', 'crawling', 'analyzing_competitors', 'optimizing_pages',
  'generating_report', 'formatting_report', 'completed', 'failed'
));

-- ─── RLS Policies ───
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Anyone can view active credit packages (public pricing)
CREATE POLICY "Anyone can view packages" ON credit_packages
  FOR SELECT USING (active = true);

-- ─── Auto-create profile on signup ───
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    3 -- 3 free credits on signup (enough for 3 Haiku audits or 1 Sonnet audit)
  );
  -- Also record the welcome grant
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (NEW.id, 3, 3, 'grant', 'Welcome credits — 3 free audits');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_jobs_user ON audit_jobs(user_id);
