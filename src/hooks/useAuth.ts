import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_IN') {
          toast({
            title: "Welcome!",
            description: "Your data will now sync across devices.",
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "Your data is stored locally.",
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  const signInAnonymously = async () => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      toast({
        title: "Error",
        description: "Failed to create anonymous session.",
        variant: "destructive",
      });
    }
  };

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Check your email",
        description: "We sent you a sign-in link.",
      });
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    isLoading,
    signInAnonymously,
    signInWithEmail,
    signOut,
  };
};