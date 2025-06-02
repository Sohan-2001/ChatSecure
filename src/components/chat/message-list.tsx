"use client";

import type { ChatMessage, UserProfile } from "@/types";
import { MessageItem } from "./message-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef }_from_ "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  contactUser: UserProfile | null;
  loadingMessages: boolean;
}

export function MessageList({ messages, contactUser, loadingMessages }: MessageListProps) {
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
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
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
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
