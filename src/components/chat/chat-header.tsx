"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

interface ChatHeaderProps {
  contactUser: UserProfile | null;
}

export function ChatHeader({ contactUser }: ChatHeaderProps) {
  if (!contactUser) {
    return (
      <div className="flex h-16 items-center border-b bg-card px-4 py-3 shadow-sm">
        Loading...
      </div>
    );
  }

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-16 items-center gap-3 border-b bg-card px-4 py-3 shadow-sm sticky top-0 z-10">
       <Link href="/chat" passHref legacyBehavior className="md:hidden">
         <Button variant="ghost" size="icon" asChild>
            <a><ArrowLeft className="h-5 w-5" /></a>
         </Button>
       </Link>
      <Avatar className="h-10 w-10">
        <AvatarImage src={contactUser.photoURL || undefined} alt={contactUser.email || 'User'} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {getInitials(contactUser.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 truncate">
        <p className="font-semibold truncate">{contactUser.displayName || contactUser.email}</p>
        {contactUser.displayName && <p className="text-xs text-muted-foreground truncate">{contactUser.email}</p>}
      </div>
      {/* Add more actions here if needed, like call, video call, info */}
    </div>
  );
}
