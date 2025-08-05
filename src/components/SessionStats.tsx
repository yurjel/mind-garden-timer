import { Card, CardContent } from '@/components/ui/card';
import { Flame, Target, Clock, TrendingUp } from 'lucide-react';

interface SessionStatsProps {
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
  totalFocusMinutes: number;
  todaysSessions: number;
}

export const SessionStats = ({
  completedSessions,
  currentStreak,
  longestStreak,
  totalFocusMinutes,
  todaysSessions,
}: SessionStatsProps) => {
  const formatFocusTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
      <Card className="text-center">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            <div className="text-2xl font-bold text-primary">{todaysSessions}</div>
            <div className="text-sm text-muted-foreground">Today</div>
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2">
            <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <div className={`text-2xl font-bold ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {currentStreak}
            </div>
            <div className="text-sm text-muted-foreground">Streak</div>
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2">
            <TrendingUp className="w-6 h-6 text-success" />
            <div className="text-2xl font-bold text-success">{longestStreak}</div>
            <div className="text-sm text-muted-foreground">Best</div>
          </div>
        </CardContent>
      </Card>

      <Card className="text-center">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 text-tertiary" />
            <div className="text-2xl font-bold text-tertiary">
              {formatFocusTime(totalFocusMinutes)}
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};