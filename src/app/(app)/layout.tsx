
"use client";
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, firebaseUser, loading } = useAuth(); // Destructure firebaseUser
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait until loading is false
    }
    if (!firebaseUser) {
      router.replace('/login');
    }
    // If firebaseUser exists but user (profile) is null,
    // it implies an issue fetching the profile (e.g., Firestore offline).
    // This case is handled by the render logic below, no redirect needed here.
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If, after loading, there's no authenticated Firebase user,
  // the useEffect should have redirected. Show a loader to prevent flicker.
  if (!firebaseUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If Firebase user is authenticated, but Firestore profile (user) is null
  // (this means profile fetch failed, likely due to "client is offline")
  if (firebaseUser && !user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 font-headline text-2xl font-semibold text-destructive">Connection Issue</h1>
        <p className="mb-4 text-muted-foreground">
          We're having trouble loading your user profile. This might be due to a network issue or our servers being temporarily unavailable.
        </p>
        <p className="text-sm text-muted-foreground">
          Please check your internet connection. The app may have limited functionality. You might need to refresh the page or try again later.
        </p>
        {/* Consider adding a manual logout button here if needed */}
      </div>
    );
  }
  
  // If both firebaseUser and user (profile) exist, render the app
  if (firebaseUser && user) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full flex-col">
          {children}
        </div>
      </SidebarProvider>
    );
  }

  // Fallback loader, though ideally one of the above conditions should always be met.
  return (
     <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}
