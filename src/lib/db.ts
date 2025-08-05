import Dexie, { Table } from 'dexie';
import { SessionType } from '@/hooks/useTimer';

export interface OfflineSession {
  id: string;
  user_id: string;
  type: SessionType;
  duration_minutes: number;
  started_at: string;
  completed_at?: string;
  was_completed: boolean;
  mood_rating?: number;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfflineSettings {
  user_id: string;
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  sessions_until_long_break: number;
  vibrate_enabled: boolean;
  sound_theme: string;
  auto_resume: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfflineStreaks {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_session_date?: string;
  total_sessions: number;
  total_focus_minutes: number;
  achievements: string[];
  created_at: string;
  updated_at: string;
}

export class MindGardenDB extends Dexie {
  sessions!: Table<OfflineSession>;
  settings!: Table<OfflineSettings>;
  streaks!: Table<OfflineStreaks>;

  constructor() {
    super('MindGardenDB');
    
    this.version(1).stores({
      sessions: 'id, user_id, type, started_at, was_completed, synced',
      settings: 'user_id',
      streaks: 'user_id',
    });
    
    this.sessions.mapToClass(function(item) { return item; });
    this.settings.mapToClass(function(item) { return item; });
    this.streaks.mapToClass(function(item) { return item; });
  }
}

export const db = new MindGardenDB();

// Helper functions for offline operations
export const saveSessionOffline = async (session: Omit<OfflineSession, 'id' | 'synced' | 'created_at' | 'updated_at'>) => {
  // Validate session data
  if (!session.user_id || !session.type || !session.duration_minutes) {
    throw new Error('Invalid session data');
  }
  
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  
  await db.sessions.add({
    ...session,
    id,
    synced: false,
    created_at: now,
    updated_at: now,
  });
  
  return id;
};

export const saveSettingsOffline = async (settings: Omit<OfflineSettings, 'created_at' | 'updated_at'>) => {
  // Validate settings data
  if (!settings.user_id || settings.work_minutes < 1 || settings.work_minutes > 60) {
    throw new Error('Invalid settings data');
  }
  
  const now = new Date().toISOString();
  
  await db.settings.put({
    ...settings,
    created_at: now,
    updated_at: now,
  });
};

export const saveStreaksOffline = async (streaks: Omit<OfflineStreaks, 'created_at' | 'updated_at'>) => {
  const now = new Date().toISOString();
  
  await db.streaks.put({
    ...streaks,
    created_at: now,
    updated_at: now,
  });
};

export const getUnsyncedSessions = async () => {
  return await db.sessions.where('synced').equals(0).toArray();
};

export const markSessionSynced = async (id: string) => {
  await db.sessions.update(id, { synced: true });
};