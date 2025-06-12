
"use client";

import type { ChatMessage, UserProfile } from "@/types";
import { MessageItem } from "./message-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  contactUser: UserProfile | null;
  loadingMessages: boolean;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
}

export function MessageList({ messages, contactUser, loadingMessages, onDeleteMessage, onEditMessage }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  if (loadingMessages) {
return (
      <div className="space-y-4 p-4 sm:p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className="h-12 w-48 rounded-lg" />
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
          </div>
        ))}
      </div>
    );
  }

  

   // Empty State
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <p className="text-lg font-medium">No messages yet.</p>
        <p className="text-sm">Start the conversation by sending a message below.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollAreaRef} viewportRef={viewportRef}>
      <div className="space-y-1">
        {messages.map((msg) => {
          const isCurrentUserMessage = msg.senderId === currentUser?.uid;
          const senderProfile = isCurrentUserMessage ? currentUser : contactUser;
          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isCurrentUserMessage={isCurrentUserMessage}
              senderProfile={{ email: senderProfile?.email || null, photoURL: senderProfile?.photoURL}}
              onDelete={onDeleteMessage}
              onEdit={onEditMessage}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
