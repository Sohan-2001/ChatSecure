"use client";

import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUserMessage: boolean;
  senderProfile?: { email: string | null, photoURL?: string | null };
}

export function MessageItem({ message, isCurrentUserMessage, senderProfile }: MessageItemProps) {
  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  const formattedTimestamp = message.timestamp ? 
    format(message.timestamp instanceof Date ? message.timestamp : message.timestamp.toDate(), 'p') 
    : '';

  return (
    <div
      className={cn(
        "flex items-end gap-2 py-2 px-1",
        isCurrentUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={senderProfile?.photoURL || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {getInitials(senderProfile?.email)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-xl px-4 py-2.5 shadow-md",
          isCurrentUserMessage
            ? "rounded-br-none bg-primary text-primary-foreground"
            : "rounded-bl-none bg-card text-card-foreground border"
        )}
      >
        <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
        <p className={cn(
            "mt-1 text-xs",
            isCurrentUserMessage ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-right"
          )}>
          {formattedTimestamp}
        </p>
      </div>
      {isCurrentUserMessage && (
         <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={senderProfile?.photoURL || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {getInitials(senderProfile?.email)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
