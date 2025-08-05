import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db, getUnsyncedSessions, markSessionSynced } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSyncing(false);
        return;
      }

      // Sync unsynced sessions
      const unsyncedSessions = await getUnsyncedSessions();
      let syncedCount = 0;
      
      for (const session of unsyncedSessions) {
        try {
          const { error } = await supabase
            .from('sessions')
            .upsert({
              id: session.id,
              user_id: session.user_id,
              type: session.type,
              duration_minutes: session.duration_minutes,
              started_at: session.started_at,
              completed_at: session.completed_at,
              was_completed: session.was_completed,
              mood_rating: session.mood_rating,
            });

          if (!error) {
            await markSessionSynced(session.id);
            syncedCount++;
          }
        } catch (error) {
          console.warn('Failed to sync session:', session.id);
        }
      }

      // Update user streaks on Supabase after syncing sessions
      if (syncedCount > 0) {
        try {
          // Get current local streaks
          const localStreaks = await db.streaks.get(user.id);
          if (localStreaks) {
            await supabase
              .from('user_streaks')
              .upsert({
                user_id: user.id,
                current_streak: localStreaks.current_streak,
                longest_streak: localStreaks.longest_streak,
                last_session_date: localStreaks.last_session_date,
                total_sessions: localStreaks.total_sessions,
                total_focus_minutes: localStreaks.total_focus_minutes,
                achievements: localStreaks.achievements,
              });
          }
        } catch (error) {
          console.warn('Failed to sync streaks');
        }
      }

      if (syncedCount > 0) {
        toast({
          title: "Data synced",
          description: `${syncedCount} sessions synced to cloud`,
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Will retry when connection improves",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline, syncOfflineData]);

  const forceSyncNow = useCallback(async () => {
    if (isOnline) {
      await syncOfflineData();
    } else {
      toast({
        title: "No connection",
        description: "Data will sync when you're back online",
        variant: "destructive",
      });
    }
  }, [isOnline, syncOfflineData, toast]);

  return {
    isOnline,
    isSyncing,
    syncOfflineData,
    forceSyncNow,
  };
};