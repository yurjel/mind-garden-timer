import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Settings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  vibrateEnabled: boolean;
  soundTheme: string;
  autoResume: boolean;
}

const defaultSettings: Settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  vibrateEnabled: true,
  soundTheme: 'default',
  autoResume: false,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Load settings from Supabase or localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Load from Supabase
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            toast({
              title: "Error loading settings",
              description: "Using default settings instead.",
              variant: "destructive",
            });
          }

          if (data) {
            setSettings({
              workMinutes: data.work_minutes,
              shortBreakMinutes: data.short_break_minutes,
              longBreakMinutes: data.long_break_minutes,
              sessionsUntilLongBreak: data.sessions_until_long_break,
              vibrateEnabled: data.vibrate_enabled,
              soundTheme: data.sound_theme,
              autoResume: data.auto_resume,
            });
          }
        } else {
          // Load from localStorage for anonymous users
          const savedSettings = localStorage.getItem('pomodoroSettings');
          if (savedSettings) {
            try {
              setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
            } catch (error) {
              // Silently fall back to default settings
            }
          }
        }
      } catch (error) {
        console.error('Error in loadSettings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadSettings();
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const saveSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      if (user) {
        // Save to Supabase
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            work_minutes: updatedSettings.workMinutes,
            short_break_minutes: updatedSettings.shortBreakMinutes,
            long_break_minutes: updatedSettings.longBreakMinutes,
            sessions_until_long_break: updatedSettings.sessionsUntilLongBreak,
            vibrate_enabled: updatedSettings.vibrateEnabled,
            sound_theme: updatedSettings.soundTheme,
            auto_resume: updatedSettings.autoResume,
          });

        if (error) {
          toast({
            title: "Error saving settings",
            description: "Your settings may not be synced across devices.",
            variant: "destructive",
          });
        }
      } else {
        // Save to localStorage for anonymous users
        localStorage.setItem('pomodoroSettings', JSON.stringify(updatedSettings));
      }
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    settings,
    saveSettings,
    isLoading,
    user,
  };
};