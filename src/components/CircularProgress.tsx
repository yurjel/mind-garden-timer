import { SessionType } from '@/hooks/useTimer';

interface CircularProgressProps {
  progress: number;
  sessionType: SessionType;
  size?: number;
  strokeWidth?: number;
  isActive?: boolean;
}

export const CircularProgress = ({ 
  progress, 
  sessionType, 
  size = 300, 
  strokeWidth = 8,
  isActive = false 
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColorForSession = (type: SessionType) => {
    switch (type) {
      case 'work':
        return 'stroke-primary';
      case 'short_break':
        return 'stroke-secondary';
      case 'long_break':
        return 'stroke-tertiary';
    }
  };

  const getGlowForSession = (type: SessionType) => {
    switch (type) {
      case 'work':
        return 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))';
      case 'short_break':
        return 'drop-shadow(0 0 8px hsl(var(--secondary) / 0.4))';
      case 'long_break':
        return 'drop-shadow(0 0 8px hsl(var(--tertiary) / 0.4))';
    }
  };

  return (
    <div className="relative">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        style={{
          filter: isActive ? getGlowForSession(sessionType) : 'none',
        }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--timer-ring))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${getColorForSession(sessionType)} transition-all duration-500 ease-out ${
            isActive ? 'timer-glow' : ''
          }`}
          style={{
            transition: 'stroke-dashoffset 1s ease-out',
          }}
        />
      </svg>
    </div>
  );
};