import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, User, LogOut } from 'lucide-react';
import { Settings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SettingsSheetProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  isLoading: boolean;
}

export const SettingsSheet = ({ settings, onSettingsChange, isLoading }: SettingsSheetProps) => {
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { user, signInWithEmail, signInAnonymously, signOut } = useAuth();
  const { toast } = useToast();

  const handleSliderChange = (key: keyof Settings, value: number[]) => {
    onSettingsChange({ [key]: value[0] });
  };

  const handleSwitchChange = (key: keyof Settings, checked: boolean) => {
    onSettingsChange({ [key]: checked });
  };

  const handleSignIn = async () => {
    if (email.includes('@')) {
      await signInWithEmail(email);
      setEmail('');
      setIsOpen(false);
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  const handleAnonymousSignIn = async () => {
    await signInAnonymously();
    setIsOpen(false);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Customize your Pomodoro experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* Timer Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Timer Durations</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="work-duration">Work Session: {settings.workMinutes} minutes</Label>
                <Slider
                  id="work-duration"
                  min={5}
                  max={60}
                  step={5}
                  value={[settings.workMinutes]}
                  onValueChange={(value) => handleSliderChange('workMinutes', value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="short-break">Short Break: {settings.shortBreakMinutes} minutes</Label>
                <Slider
                  id="short-break"
                  min={1}
                  max={15}
                  step={1}
                  value={[settings.shortBreakMinutes]}
                  onValueChange={(value) => handleSliderChange('shortBreakMinutes', value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="long-break">Long Break: {settings.longBreakMinutes} minutes</Label>
                <Slider
                  id="long-break"
                  min={5}
                  max={60}
                  step={5}
                  value={[settings.longBreakMinutes]}
                  onValueChange={(value) => handleSliderChange('longBreakMinutes', value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="sessions-until-long">
                  Work sessions until long break: {settings.sessionsUntilLongBreak}
                </Label>
                <Slider
                  id="sessions-until-long"
                  min={2}
                  max={8}
                  step={1}
                  value={[settings.sessionsUntilLongBreak]}
                  onValueChange={(value) => handleSliderChange('sessionsUntilLongBreak', value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="vibrate">Vibration</Label>
              <Switch
                id="vibrate"
                checked={settings.vibrateEnabled}
                onCheckedChange={(checked) => handleSwitchChange('vibrateEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-resume">Auto-resume next session</Label>
              <Switch
                id="auto-resume"
                checked={settings.autoResume}
                onCheckedChange={(checked) => handleSwitchChange('autoResume', checked)}
              />
            </div>
          </div>

          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Account</h3>
            
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <User className="w-4 h-4" />
                  <span className="text-sm">
                    {user.email || 'Anonymous User'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in to sync your data across devices
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button onClick={handleSignIn}>
                    Sign In
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleAnonymousSignIn}
                  className="w-full"
                >
                  Continue Anonymously
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};