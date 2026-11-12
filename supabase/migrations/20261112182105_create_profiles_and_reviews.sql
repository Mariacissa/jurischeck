/*
# Create profiles and reviews tables for JurisCheck

## Purpose
Sets up the database schema for a multi-user legal document review app.
Each authenticated user has a profile and can create reviews (document analyses).

## 1. New Tables

### profiles
- `id` (uuid, primary key, references auth.users) — one row per user
- `full_name` (text) — display name shown in the UI
- `created_at` (timestamptz) — when the profile was created
- `trial_started_at` (timestamptz) — when the free trial began
- `plan` (text, default 'trial') — subscription plan: trial, weekly, monthly, annual
- `subscription_status` (text, default 'trialing') — current subscription state

### reviews
- `id` (uuid, primary key) — unique review identifier
- `user_id` (uuid, not null, defaults to auth.uid()) — owner of the review
- `file_name` (text, not null) — name of the uploaded document
- `status` (text, default 'queued') — processing status
- `report` (jsonb, default '{}') — the review findings as JSON
- `extracted_text` (text) — the text extracted from the document
- `created_at` (timestamptz) — when the review was created

## 2. Security — RLS Policies

### profiles
- SELECT: users can read only their own profile
- UPDATE: users can update only their own profile (e.g. full_name)
- No INSERT policy: profiles are created automatically via a trigger when a user signs up
- No DELETE: profiles are cascade-deleted when the auth.users row is deleted

### reviews
- SELECT: users can read only their own reviews
- INSERT: users can insert reviews only for themselves (user_id defaults to auth.uid())
- UPDATE: users can update only their own reviews
- DELETE: users can delete only their own reviews

## 3. Trigger: auto-create profile on signup

A trigger function `handle_new_user()` creates a profiles row whenever a new
auth.users row is inserted. This ensures every user has a profile without
requiring a separate API call from the frontend.

## 4. Grants
- profiles: SELECT, UPDATE to authenticated
- reviews: SELECT, INSERT, UPDATE, DELETE to authenticated

## Important Notes
1. Email confirmation is OFF — users can sign in immediately after sign-up.
2. The `user_id` column on reviews defaults to `auth.uid()` so frontend inserts
   that omit user_id still pass the RLS check.
3. The trigger auto-creates profiles so the frontend never needs to insert into
   profiles directly.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================== PROFILES TABLE =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','weekly','monthly','annual')),
  subscription_status text NOT NULL DEFAULT 'trialing'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===================== REVIEWS TABLE =====================

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
CREATE POLICY "reviews_select_own" ON public.reviews FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===================== AUTO-CREATE PROFILE TRIGGER =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
