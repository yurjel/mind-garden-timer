import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { SessionType } from './useTimer';

export interface PomodoroSession {
  id: string;
  type: SessionType;
  duration_minutes: number;
  started_at: string;
  completed_at?: string;
  was_completed: boolean;
  mood_rating?: number;
}

export interface UserStreaks {
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
  total_focus_minutes: number;
  last_session_date?: string;
  achievements: string[];
}

export const usePomodoro = () => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [streaks, setStreaks] = useState<UserStreaks>({
    current_streak: 0,
    longest_streak: 0,
    total_sessions: 0,
    total_focus_minutes: 0,
    achievements: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load sessions and streaks from Supabase or localStorage
  const loadData = useCallback(async () => {
    try {
      if (user) {
        // Load from Supabase
        const [sessionsResult, streaksResult] = await Promise.all([
          supabase
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(50),
          supabase
            .from('user_streaks')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        if (sessionsResult.error) {
          console.error('Error loading sessions:', sessionsResult.error);
        } else {
          // Map the database results to our interface
          const mappedSessions: PomodoroSession[] = (sessionsResult.data || []).map(session => ({
            id: session.id,
            type: session.type as SessionType,
            duration_minutes: session.duration_minutes,
            started_at: session.started_at,
            completed_at: session.completed_at || undefined,
            was_completed: session.was_completed,
            mood_rating: session.mood_rating || undefined,
          }));
          setSessions(mappedSessions);
        }

        if (streaksResult.error && streaksResult.error.code !== 'PGRST116') {
          console.error('Error loading streaks:', streaksResult.error);
        } else if (streaksResult.data) {
          setStreaks({
            current_streak: streaksResult.data.current_streak,
            longest_streak: streaksResult.data.longest_streak,
            total_sessions: streaksResult.data.total_sessions,
            total_focus_minutes: streaksResult.data.total_focus_minutes,
            last_session_date: streaksResult.data.last_session_date,
            achievements: streaksResult.data.achievements || [],
          });
        }
      } else {
        // Load from localStorage for anonymous users
        const savedSessions = localStorage.getItem('pomodoroSessions');
        const savedStreaks = localStorage.getItem('pomodoroStreaks');
        
        if (savedSessions) {
          try {
            setSessions(JSON.parse(savedSessions));
          } catch (error) {
            console.error('Error parsing saved sessions:', error);
          }
        }
        
        if (savedStreaks) {
          try {
            setStreaks(JSON.parse(savedStreaks));
          } catch (error) {
            console.error('Error parsing saved streaks:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start a new session
  const startSession = useCallback(async (type: SessionType, durationMinutes: number): Promise<string | null> => {
    const session: Omit<PomodoroSession, 'id'> = {
      type,
      duration_minutes: durationMinutes,
      started_at: new Date().toISOString(),
      was_completed: false,
    };

    try {
      if (user) {
        const { data, error } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            ...session,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          return null;
        }

        const newSession: PomodoroSession = {
          id: data.id,
          type: data.type as SessionType,
          duration_minutes: data.duration_minutes,
          started_at: data.started_at,
          completed_at: data.completed_at || undefined,
          was_completed: data.was_completed,
          mood_rating: data.mood_rating || undefined,
        };
        setSessions(prev => [newSession, ...prev]);
        return newSession.id;
      } else {
        // Handle locally for anonymous users
        const newSession: PomodoroSession = {
          id: Math.random().toString(36).substr(2, 9),
          ...session,
        };
        
        const updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        localStorage.setItem('pomodoroSessions', JSON.stringify(updatedSessions));
        return newSession.id;
      }
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  }, [user, sessions]);

  // Complete a session
  const completeSession = useCallback(async (sessionId: string, moodRating?: number) => {
    try {
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return;

      const session = sessions[sessionIndex];
      const updatedSession = {
        ...session,
        completed_at: new Date().toISOString(),
        was_completed: true,
        mood_rating: moodRating,
      };

      if (user) {
        const { error } = await supabase
          .from('sessions')
          .update({
            completed_at: updatedSession.completed_at,
            was_completed: true,
            mood_rating: moodRating,
          })
          .eq('id', sessionId);

        if (error) {
          console.error('Error completing session:', error);
          return;
        }
      }

      // Update local state
      const updatedSessions = [...sessions];
      updatedSessions[sessionIndex] = updatedSession;
      setSessions(updatedSessions);

      // Save to localStorage for anonymous users
      if (!user) {
        localStorage.setItem('pomodoroSessions', JSON.stringify(updatedSessions));
      }

      // Update streaks if it's a work session
      if (session.type === 'work') {
        await updateStreaks();
      }
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [sessions, user]);

  // Update streaks and achievements
  const updateStreaks = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const completedWorkSessions = sessions.filter(s => 
        s.type === 'work' && s.was_completed
      );

      const todaysWorkSessions = completedWorkSessions.filter(s =>
        s.completed_at && s.completed_at.startsWith(today)
      ).length;

      const totalWorkSessions = completedWorkSessions.length;
      const totalFocusMinutes = completedWorkSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

      // Calculate streak
      let currentStreak = 0;
      if (todaysWorkSessions > 0) {
        currentStreak = 1;
        // Check previous days
        let checkDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        while (checkDate) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const daysSessions = completedWorkSessions.filter(s =>
            s.completed_at && s.completed_at.startsWith(dateStr)
          ).length;
          
          if (daysSessions > 0) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
          } else {
            break;
          }
        }
      }

      const longestStreak = Math.max(streaks.longest_streak, currentStreak);

      // Check for new achievements
      const newAchievements = [...streaks.achievements];
      if (totalWorkSessions >= 1 && !newAchievements.includes('first_session')) {
        newAchievements.push('first_session');
        toast({
          title: "Achievement Unlocked! 🎉",
          description: "Completed your first Pomodoro session!",
        });
      }
      if (totalWorkSessions >= 10 && !newAchievements.includes('ten_sessions')) {
        newAchievements.push('ten_sessions');
        toast({
          title: "Achievement Unlocked! 🏆",
          description: "Completed 10 Pomodoro sessions!",
        });
      }
      if (currentStreak >= 7 && !newAchievements.includes('week_streak')) {
        newAchievements.push('week_streak');
        toast({
          title: "Achievement Unlocked! 🔥",
          description: "7-day streak! You're on fire!",
        });
      }

      const updatedStreaks: UserStreaks = {
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_sessions: totalWorkSessions,
        total_focus_minutes: totalFocusMinutes,
        last_session_date: todaysWorkSessions > 0 ? today : streaks.last_session_date,
        achievements: newAchievements,
      };

      setStreaks(updatedStreaks);

      if (user) {
        const { error } = await supabase
          .from('user_streaks')
          .upsert({
            user_id: user.id,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            total_sessions: totalWorkSessions,
            total_focus_minutes: totalFocusMinutes,
            last_session_date: todaysWorkSessions > 0 ? today : null,
            achievements: newAchievements,
          });

        if (error) {
          console.error('Error updating streaks:', error);
        }
      } else {
        localStorage.setItem('pomodoroStreaks', JSON.stringify(updatedStreaks));
      }
    } catch (error) {
      console.error('Error updating streaks:', error);
    }
  }, [sessions, streaks, user, toast]);

  // Get today's sessions
  const getTodaysSessions = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(s => 
      s.completed_at && s.completed_at.startsWith(today) && s.was_completed && s.type === 'work'
    ).length;
  }, [sessions]);

  return {
    sessions,
    streaks,
    isLoading,
    startSession,
    completeSession,
    updateStreaks,
    todaysSessions: getTodaysSessions(),
  };
};