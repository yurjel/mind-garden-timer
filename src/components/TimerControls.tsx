import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { SessionType } from '@/hooks/useTimer';

interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: SessionType;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export const TimerControls = ({
  isRunning,
  isPaused,
  sessionType,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
}: TimerControlsProps) => {
  const getMainButtonVariant = () => {
    switch (sessionType) {
      case 'work':
        return 'default'; // Uses primary color
      case 'short_break':
      case 'long_break':
        return 'secondary';
    }
  };

  const getMainButtonText = () => {
    if (!isRunning && !isPaused) return 'Start';
    if (isRunning) return 'Pause';
    if (isPaused) return 'Resume';
    return 'Start';
  };

  const handleMainButtonClick = () => {
    if (!isRunning && !isPaused) {
      onStart();
    } else if (isRunning) {
      onPause();
    } else if (isPaused) {
      onResume();
    }
  };

  const getSkipButtonText = () => {
    return sessionType === 'work' ? 'Skip to Break' : 'Skip to Work';
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Main control button */}
      <Button
        onClick={handleMainButtonClick}
        size="lg"
        variant={getMainButtonVariant()}
        className={`text-xl px-12 py-6 rounded-full min-w-[160px] ${
          isRunning ? 'pulse-active' : ''
        }`}
      >
        {!isRunning && !isPaused && <Play className="w-6 h-6 mr-2" />}
        {isRunning && <Pause className="w-6 h-6 mr-2" />}
        {isPaused && <Play className="w-6 h-6 mr-2" />}
        {getMainButtonText()}
      </Button>

      {/* Secondary controls */}
      <div className="flex gap-3">
        {(isRunning || isPaused) && (
          <>
            <Button
              onClick={onSkip}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              {getSkipButtonText()}
            </Button>
            
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
};