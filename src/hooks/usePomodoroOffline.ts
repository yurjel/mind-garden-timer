import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionType } from './useTimer';
import { 
  db, 
  saveSessionOffline, 
  saveStreaksOffline, 
  OfflineStreaks,
  OfflineSession 
} from '@/lib/db';

interface PomodoroState {
  sessions: OfflineSession[];
  streaks: OfflineStreaks;
  isLoading: boolean;
}

export const usePomodoroOffline = () => {
  const [state, setState] = useState<PomodoroState>({
    sessions: [],
    streaks: {
      user_id: 'offline',
      current_streak: 0,
      longest_streak: 0,
      last_session_date: undefined,
      total_sessions: 0,
      total_focus_minutes: 0,
      achievements: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading: true,
  });
  
  const { toast } = useToast();

  // Load data from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'offline';

        // Load sessions
        const sessions = await db.sessions
          .where('user_id')
          .equals(userId)
          .reverse()
          .sortBy('started_at');

        // Load or create streaks
        let streaks = await db.streaks.get(userId);
        if (!streaks) {
          streaks = {
            user_id: userId,
            current_streak: 0,
            longest_streak: 0,
            total_sessions: 0,
            total_focus_minutes: 0,
            achievements: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await saveStreaksOffline(streaks);
        }

        setState({
          sessions: sessions || [],
          streaks,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load offline data:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadData();
  }, []);

  const startSession = useCallback(async (type: SessionType, durationMinutes: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'offline';
      
      const sessionId = await saveSessionOffline({
        user_id: userId,
        type,
        duration_minutes: durationMinutes,
        started_at: new Date().toISOString(),
        was_completed: false,
      });

      // Update local state
      const newSession = await db.sessions.get(sessionId);
      if (newSession) {
        setState(prev => ({
          ...prev,
          sessions: [newSession, ...prev.sessions],
        }));
      }

      return sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const completeSession = useCallback(async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'offline';
      
      // Update session as completed
      await db.sessions.update(sessionId, {
        completed_at: new Date().toISOString(),
        was_completed: true,
        updated_at: new Date().toISOString(),
      });

      // Update streaks
      const today = new Date().toISOString().split('T')[0];
      const session = await db.sessions.get(sessionId);
      
      if (session && session.type === 'work') {
        const updatedStreaks = {
          ...state.streaks,
          total_sessions: state.streaks.total_sessions + 1,
          total_focus_minutes: state.streaks.total_focus_minutes + session.duration_minutes,
          current_streak: state.streaks.last_session_date === today 
            ? state.streaks.current_streak 
            : state.streaks.current_streak + 1,
          longest_streak: Math.max(
            state.streaks.longest_streak, 
            state.streaks.current_streak + 1
          ),
          last_session_date: today,
          updated_at: new Date().toISOString(),
        };

        await saveStreaksOffline(updatedStreaks);
        
        setState(prev => ({
          ...prev,
          streaks: updatedStreaks,
          sessions: prev.sessions.map(s => 
            s.id === sessionId 
              ? { ...s, completed_at: new Date().toISOString(), was_completed: true }
              : s
          ),
        }));

        toast({
          title: "Session completed!",
          description: `Great job! You completed a ${session.duration_minutes}-minute focus session.`,
        });
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
      toast({
        title: "Error",
        description: "Failed to complete session",
        variant: "destructive",
      });
    }
  }, [state.streaks, toast]);

  return {
    sessions: state.sessions,
    streaks: state.streaks,
    isLoading: state.isLoading,
    startSession,
    completeSession,
  };
};