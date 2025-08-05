import { useState, useEffect, useRef, useCallback } from 'react';
import { SessionType } from './useTimer';

export interface WorkerTimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  completedSessions: number;
}

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoResume: boolean;
  vibrateEnabled: boolean;
}

export const useTimerWorker = (settings: TimerSettings) => {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<WorkerTimerState>({
    timeLeft: settings.workMinutes * 60,
    isRunning: false,
    isPaused: false,
    sessionType: 'work' as SessionType,
    completedSessions: 0,
  });

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker('/timer-worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type, remainingTime, isRunning, isPaused } = e.data;
      
      setState(prev => ({
        ...prev,
        timeLeft: remainingTime,
        isRunning,
        isPaused,
      }));
      
      if (type === 'timer-completed') {
        handleSessionComplete();
      }
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

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

  const showNotification = useCallback((type: SessionType, isComplete: boolean) => {
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((registration) => {
        const title = isComplete ? 'Session Complete!' : 'Session Started';
        const body = isComplete 
          ? `${type === 'work' ? 'Work' : 'Break'} session completed.`
          : `Starting ${type === 'work' ? 'work' : 'break'} session`;
        
        registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...(settings.vibrateEnabled && { vibrate: [100, 50, 100] }),
          requireInteraction: true,
          tag: 'timer-notification',
          data: { type, isComplete },
        });
      });
    }
  }, [settings.vibrateEnabled]);

  const playNotificationSound = useCallback(() => {
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

  const handleSessionComplete = useCallback(() => {
    playNotificationSound();
    showNotification(state.sessionType, true);

    const newCompletedSessions = state.sessionType === 'work' 
      ? state.completedSessions + 1 
      : state.completedSessions;

    const nextType = getNextSessionType(state.sessionType, state.completedSessions);
    const nextDuration = getSessionDuration(nextType);

    setState(prev => ({
      ...prev,
      sessionType: nextType,
      timeLeft: nextDuration,
      completedSessions: newCompletedSessions,
      isRunning: false,
      isPaused: false,
    }));

    // Auto-resume if enabled
    if (settings.autoResume) {
      setTimeout(() => start(), 1000);
    }
  }, [state.sessionType, state.completedSessions, getNextSessionType, getSessionDuration, playNotificationSound, showNotification, settings.autoResume]);

  const start = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'start',
        payload: { duration: state.timeLeft }
      });
      showNotification(state.sessionType, false);
    }
  }, [state.timeLeft, state.sessionType, showNotification]);

  const pause = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pause' });
    }
  }, []);

  const resume = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'resume' });
    }
  }, []);

  const skip = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      handleSessionComplete();
    }
  }, [handleSessionComplete]);

  const reset = useCallback(() => {
    if (workerRef.current) {
      const duration = getSessionDuration(state.sessionType);
      workerRef.current.postMessage({
        type: 'reset',
        payload: { duration }
      });
      setState(prev => ({
        ...prev,
        timeLeft: duration,
        isRunning: false,
        isPaused: false,
      }));
    }
  }, [state.sessionType, getSessionDuration]);

  // Update timer when settings change
  useEffect(() => {
    if (!state.isRunning && !state.isPaused) {
      const newDuration = getSessionDuration(state.sessionType);
      setState(prev => ({
        ...prev,
        timeLeft: newDuration,
      }));
      
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'reset',
          payload: { duration: newDuration }
        });
      }
    }
  }, [settings, getSessionDuration, state.isRunning, state.isPaused, state.sessionType]);

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