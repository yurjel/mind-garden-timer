import { CircularProgress } from './CircularProgress';
import { SessionType } from '@/hooks/useTimer';

interface TimerDisplayProps {
  timeLeft: number;
  sessionType: SessionType;
  isRunning: boolean;
  formatTime: (seconds: number) => string;
  progress: number;
}

export const TimerDisplay = ({
  timeLeft,
  sessionType,
  isRunning,
  formatTime,
  progress,
}: TimerDisplayProps) => {
  const getSessionLabel = (type: SessionType) => {
    switch (type) {
      case 'work':
        return 'Focus Time';
      case 'short_break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
    }
  };

  const getSessionColor = (type: SessionType) => {
    switch (type) {
      case 'work':
        return 'text-primary';
      case 'short_break':
        return 'text-secondary';
      case 'long_break':
        return 'text-tertiary';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Session type label */}
      <div className={`text-lg font-medium mb-4 ${getSessionColor(sessionType)}`}>
        {getSessionLabel(sessionType)}
      </div>

      {/* Circular progress with timer in center */}
      <div className="relative">
        <CircularProgress
          progress={progress}
          sessionType={sessionType}
          size={300}
          strokeWidth={12}
          isActive={isRunning}
        />
        
        {/* Timer text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-6xl font-bold tabular-nums ${getSessionColor(sessionType)}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Subtle progress indicator */}
      <div className="mt-6 text-sm text-muted-foreground">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
};