
-- ============ ENUMS ============
CREATE TYPE public.account_type AS ENUM ('creator', 'fan');
CREATE TYPE public.visibility_type AS ENUM ('free', 'subscribers', 'ppv');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired');
CREATE TYPE public.transaction_type AS ENUM ('bonus', 'subscription', 'ppv_unlock', 'tip', 'earning', 'refund');
CREATE TYPE public.notification_type AS ENUM ('new_follower', 'new_subscriber', 'new_message', 'new_tip', 'content_unlocked');
CREATE TYPE public.media_type AS ENUM ('image', 'video');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  account_type public.account_type NOT NULL DEFAULT 'fan',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CREATOR PROFILES ============
CREATE TABLE public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  banner_url TEXT,
  subscription_price NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator profiles viewable by authenticated"
  ON public.creator_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators can manage their creator profile"
  ON public.creator_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_creator_profiles_updated BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows viewable by authenticated"
  ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, creator_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own subscriptions (as fan or creator)"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = fan_id OR auth.uid() = creator_id);
CREATE POLICY "Fans can subscribe"
  ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Fans can update their subscriptions"
  ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = fan_id);
CREATE INDEX idx_subscriptions_fan ON public.subscriptions(fan_id);
CREATE INDEX idx_subscriptions_creator ON public.subscriptions(creator_id);

-- ============ POSTS ============
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT,
  media_url TEXT,
  media_type public.media_type NOT NULL DEFAULT 'image',
  visibility public.visibility_type NOT NULL DEFAULT 'free',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated"
  ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage their own posts"
  ON public.posts FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE INDEX idx_posts_creator ON public.posts(creator_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- ============ STORIES ============
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type public.media_type NOT NULL DEFAULT 'image',
  visibility public.visibility_type NOT NULL DEFAULT 'free',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories viewable by authenticated"
  ON public.stories FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Creators manage their own stories"
  ON public.stories FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE INDEX idx_stories_creator ON public.stories(creator_id);

-- ============ REELS ============
CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT,
  caption TEXT,
  visibility public.visibility_type NOT NULL DEFAULT 'free',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reels viewable by authenticated"
  ON public.reels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creators manage their own reels"
  ON public.reels FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE INDEX idx_reels_creator ON public.reels(creator_id);

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type public.media_type,
  ppv_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see messages they sent or received"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages as themselves"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark unlocked"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE INDEX idx_messages_pair ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);

-- ============ CONTENT UNLOCKS ============
CREATE TABLE public.content_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post','reel','message')),
  content_id UUID NOT NULL,
  price_paid NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);
ALTER TABLE public.content_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own unlocks"
  ON public.content_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own unlocks"
  ON public.content_unlocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_unlocks_user ON public.content_unlocks(user_id, content_type);

-- ============ TOKENS ============
CREATE TABLE public.tokens (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own token balance"
  ON public.tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_tokens_updated BEFORE UPDATE ON public.tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TOKEN TRANSACTIONS ============
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type public.transaction_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own transactions"
  ON public.token_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tx_user ON public.token_transactions(user_id, created_at DESC);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type public.notification_type NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their notifications"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update their notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============ SPEND TOKENS RPC (atomic) ============
CREATE OR REPLACE FUNCTION public.spend_tokens(
  _amount NUMERIC,
  _type public.transaction_type,
  _description TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _new_balance NUMERIC;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  UPDATE public.tokens
    SET balance = balance - _amount, updated_at = now()
    WHERE user_id = _user AND balance >= _amount
    RETURNING balance INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  INSERT INTO public.token_transactions(user_id, amount, type, description)
    VALUES (_user, -_amount, _type, _description);

  RETURN _new_balance;
END;
$$;

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
  _display TEXT := COALESCE(NEW.raw_user_meta_data->>'display_name', _username);
  _account public.account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'fan');
  _price NUMERIC := COALESCE((NEW.raw_user_meta_data->>'subscription_price')::NUMERIC, 9.99);
BEGIN
  INSERT INTO public.profiles(id, username, display_name, account_type)
    VALUES (NEW.id, _username, _display, _account);

  IF _account = 'creator' THEN
    INSERT INTO public.creator_profiles(user_id, subscription_price)
      VALUES (NEW.id, _price);
  END IF;

  INSERT INTO public.tokens(user_id, balance) VALUES (NEW.id, 500);
  INSERT INTO public.token_transactions(user_id, amount, type, description)
    VALUES (NEW.id, 500, 'bonus', 'Welcome to INTIMA');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
