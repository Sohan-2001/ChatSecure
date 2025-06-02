
"use client";
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'; 
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, firebaseUser, loading, retryFetchProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (loading) {
      return; 
    }
    if (!firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, loading, router]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryFetchProfile();
      // If retry is successful, the `user` state in useAuth will update,
      // and this component will re-render, hopefully out of the error state.
      // We can add a small success toast.
      // However, the main check `if (firebaseUser && user)` will determine if we exit this screen.
      // We need to check the `user` state *after* retry.
      // The `useAuth` hook will provide the updated `user`.
    } catch (error) {
      // Error is already logged by AuthProvider
      toast({
        variant: "destructive",
        title: "Retry Failed",
        description: "Still unable to load your profile. Please check your connection or try again later.",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (loading && !isRetrying) { // Show main loader only if not in the middle of a manual retry
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (firebaseUser && !user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 font-headline text-2xl font-semibold text-destructive">Connection Issue</h1>
        <p className="mb-4 max-w-md text-muted-foreground">
          We're having trouble loading your user profile. This might be due to a network issue or our servers being temporarily unavailable.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Please check your internet connection. The app may have limited functionality.
        </p>
        <Button onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </Button>
      </div>
    );
  }
  
  if (firebaseUser && user) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full flex-col">
          {children}
        </div>
      </SidebarProvider>
    );
  }

  return (
     <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}
