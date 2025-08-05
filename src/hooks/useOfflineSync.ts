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
      if (!user) return;

      // Sync unsynced sessions
      const unsyncedSessions = await getUnsyncedSessions();
      
      for (const session of unsyncedSessions) {
        try {
          const { error } = await supabase
            .from('sessions')
            .insert({
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
          }
        } catch (error) {
          console.error('Failed to sync session:', session.id, error);
        }
      }

      if (unsyncedSessions.length > 0) {
        toast({
          title: "Data synced",
          description: `${unsyncedSessions.length} sessions synced to cloud`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
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