import { useEffect, useState } from 'react';
import { TimerDisplay } from '@/components/TimerDisplay';
import { TimerControls } from '@/components/TimerControls';
import { SessionStats } from '@/components/SessionStats';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useTimerWorker } from '@/hooks/useTimerWorker';
import { useSettings } from '@/hooks/useSettings';
import { usePomodoroOffline } from '@/hooks/usePomodoroOffline';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

const Index = () => {
  const { settings, saveSettings, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const { isOnline, isSyncing } = useOfflineSync();
  const {
    sessions,
    streaks,
    isLoading: pomodoroLoading,
    startSession,
    completeSession,
  } = usePomodoroOffline();

  const timer = useTimerWorker(settings);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle session start
  const handleStart = async () => {
    const duration = timer.sessionType === 'work' ? settings.workMinutes : 
                    timer.sessionType === 'short_break' ? settings.shortBreakMinutes : 
                    settings.longBreakMinutes;
    
    const sessionId = await startSession(timer.sessionType, duration);
    if (sessionId) {
      setCurrentSessionId(sessionId);
      timer.start();
    }
  };

  // Handle session completion
  useEffect(() => {
    if (timer.timeLeft === 0 && currentSessionId && timer.sessionType === 'work') {
      completeSession(currentSessionId);
      setCurrentSessionId(null);
    }
  }, [timer.timeLeft, currentSessionId, timer.sessionType, completeSession]);

  if (settingsLoading || pomodoroLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-2xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-primary-foreground"></div>
            </div>
            <h1 className="text-xl font-bold">Mind Garden</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <SettingsSheet
              settings={settings}
              onSettingsChange={saveSettings}
              isLoading={settingsLoading}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-12">
          {/* Timer Display */}
          <TimerDisplay
            timeLeft={timer.timeLeft}
            sessionType={timer.sessionType}
            isRunning={timer.isRunning}
            formatTime={timer.formatTime}
            progress={timer.progress}
          />

          {/* Timer Controls */}
          <TimerControls
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            sessionType={timer.sessionType}
            onStart={handleStart}
            onPause={timer.pause}
            onResume={timer.resume}
            onSkip={timer.skip}
            onReset={timer.reset}
          />

          {/* Stats Section */}
          {showStats && (
            <div className="w-full max-w-4xl animate-fade-in">
              <SessionStats
                completedSessions={timer.completedSessions}
                currentStreak={streaks.current_streak}
                longestStreak={streaks.longest_streak}
                totalFocusMinutes={streaks.total_focus_minutes}
                todaysSessions={streaks.total_sessions > 0 ? Math.min(4, streaks.total_sessions) : 0}
              />
            </div>
          )}

          {/* Connection status */}
          <div className="text-center text-sm text-muted-foreground">
            {!isOnline ? (
              <p>📱 Offline mode • Data saved locally</p>
            ) : user ? (
              <p>{isSyncing ? '🔄 Syncing...' : '✓ Synced across devices'}</p>
            ) : (
              <p>📱 Online • Sign in to sync across devices</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
