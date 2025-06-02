"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { moderateMessage } from "@/ai/flows/moderate-message"; // Ensure this path is correct

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      // Moderate message
      const moderationResult = await moderateMessage({ message: messageText.trim() });

      if (moderationResult.isSafe) {
        await onSendMessage(messageText.trim());
        setMessageText("");
      } else {
        toast({
          variant: "destructive",
          title: "Message Not Sent",
          description: moderationResult.reason || "Your message was flagged by our content moderation system.",
        });
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send message. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex items-start gap-2 border-t bg-card p-4">
      <Textarea
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring"
        rows={1}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${Math.min(target.scrollHeight, 120)}px`; // Max height ~5 lines
        }}
        disabled={isSending}
      />
      <Button
        onClick={handleSendMessage}
        disabled={isSending || !messageText.trim()}
        size="icon"
        className="h-10 w-10 rounded-full shrink-0"
        aria-label="Send message"
      >
        {isSending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <SendHorizonal className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
