import { useState, useRef, useCallback, useEffect } from 'react';

export type SessionType = 'work' | 'short_break' | 'long_break';

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  completedSessions: number;
  currentSessionStartTime: Date | null;
}

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoResume: boolean;
  vibrateEnabled: boolean;
}

export const useTimer = (settings: TimerSettings) => {
  const [state, setState] = useState<TimerState>({
    timeLeft: settings.workMinutes * 60,
    isRunning: false,
    isPaused: false,
    sessionType: 'work',
    completedSessions: 0,
    currentSessionStartTime: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const getSessionDuration = useCallback((type: SessionType): number => {
    switch (type) {
      case 'work':
        return settings.workMinutes * 60;
      case 'short_break':
        return settings.shortBreakMinutes * 60;
      case 'long_break':
        return settings.longBreakMinutes * 60;
    }
  }, [settings]);

  const getNextSessionType = useCallback((currentType: SessionType, completedSessions: number): SessionType => {
    if (currentType === 'work') {
      return (completedSessions + 1) % settings.sessionsUntilLongBreak === 0 
        ? 'long_break' 
        : 'short_break';
    }
    return 'work';
  }, [settings.sessionsUntilLongBreak]);

  const playNotificationSound = useCallback(() => {
    // Simple beep sound using Web Audio API
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    }
  }, []);

  const vibrate = useCallback(() => {
    if (settings.vibrateEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }, [settings.vibrateEnabled]);

  const showNotification = useCallback((type: SessionType, isComplete: boolean) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = isComplete ? 'Session Complete!' : 'Starting Session';
      const body = isComplete 
        ? `${type === 'work' ? 'Work' : 'Break'} session completed. Time for a ${getNextSessionType(type, state.completedSessions)}.`
        : `Starting ${type === 'work' ? 'work' : 'break'} session`;
      
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, [getNextSessionType, state.completedSessions]);

  const completeSession = useCallback(() => {
    playNotificationSound();
    vibrate();
    showNotification(state.sessionType, true);

    const newCompletedSessions = state.sessionType === 'work' 
      ? state.completedSessions + 1 
      : state.completedSessions;

    const nextType = getNextSessionType(state.sessionType, state.completedSessions);
    const nextDuration = getSessionDuration(nextType);

    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      sessionType: nextType,
      timeLeft: nextDuration,
      completedSessions: newCompletedSessions,
      currentSessionStartTime: null,
    }));

    // Auto-resume if enabled
    if (settings.autoResume) {
      setTimeout(() => start(), 1000);
    }
  }, [state.sessionType, state.completedSessions, getNextSessionType, getSessionDuration, playNotificationSound, vibrate, showNotification, settings.autoResume]);

  const tick = useCallback(() => {
    setState(prev => {
      const newTimeLeft = prev.timeLeft - 1;
      
      if (newTimeLeft <= 0) {
        completeSession();
        return prev;
      }
      
      return { ...prev, timeLeft: newTimeLeft };
    });
  }, [completeSession]);

  const start = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentSessionStartTime: prev.currentSessionStartTime || new Date(),
    }));

    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    
    intervalRef.current = setInterval(tick, 1000);
    showNotification(state.sessionType, false);
  }, [tick, showNotification, state.sessionType]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    pausedTimeRef.current += Date.now() - startTimeRef.current;
    
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: true,
    }));
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    completeSession();
  }, [completeSession]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      timeLeft: getSessionDuration(prev.sessionType),
      isRunning: false,
      isPaused: false,
      currentSessionStartTime: null,
    }));
  }, [getSessionDuration]);

  // Update timer when settings change
  useEffect(() => {
    if (!state.isRunning && !state.isPaused) {
      setState(prev => ({
        ...prev,
        timeLeft: getSessionDuration(prev.sessionType),
      }));
    }
  }, [settings, getSessionDuration, state.isRunning, state.isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get progress percentage
  const getProgress = useCallback((): number => {
    const totalDuration = getSessionDuration(state.sessionType);
    return ((totalDuration - state.timeLeft) / totalDuration) * 100;
  }, [state.timeLeft, state.sessionType, getSessionDuration]);

  return {
    ...state,
    start,
    pause,
    resume,
    skip,
    reset,
    formatTime,
    getProgress,
    formattedTime: formatTime(state.timeLeft),
    progress: getProgress(),
  };
};