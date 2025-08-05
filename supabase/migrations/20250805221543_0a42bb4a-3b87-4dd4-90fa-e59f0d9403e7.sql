-- Fix database function search paths and update RLS policies for anonymous users

-- Update the handle_new_user function with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  -- Create default streak record
  INSERT INTO public.user_streaks (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Update the update_updated_at_column function with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Drop existing RLS policies for sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

-- Create new RLS policies for sessions that support anonymous users
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can create their own sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

-- Drop existing RLS policies for user_settings table
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

-- Create new RLS policies for user_settings that support anonymous users
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

-- Drop existing RLS policies for user_streaks table
DROP POLICY IF EXISTS "Users can view their own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can create their own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update their own streaks" ON public.user_streaks;

-- Create new RLS policies for user_streaks that support anonymous users
CREATE POLICY "Users can view their own streaks" 
ON public.user_streaks 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can create their own streaks" 
ON public.user_streaks 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);

CREATE POLICY "Users can update their own streaks" 
ON public.user_streaks 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (user_id = 'offline' AND auth.uid() IS NULL)
);