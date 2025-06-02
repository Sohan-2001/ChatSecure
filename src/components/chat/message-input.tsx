"use client";

import { useState, useEffect } from "react";
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
  const [currentMaxHeight, setCurrentMaxHeight] = useState(120);

  useEffect(() => {
    const updateMaxHeight = () => {
      const newMaxHeight = window.innerWidth >= 768 ? 200 : 120; // md breakpoint (768px)
      setCurrentMaxHeight(newMaxHeight);
    };

    updateMaxHeight(); // Set initial value
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      // Moderate message
      const moderationResult = await moderateMessage({ message: messageText.trim() });

      if (moderationResult.isSafe) {
        await onSendMessage(messageText.trim());
        setMessageText("");
        // Manually reset textarea height after sending if needed, though it should clear with messageText
        const textarea = document.querySelector('textarea[placeholder="Type your message..."]');
        if (textarea) {
          (textarea as HTMLTextAreaElement).style.height = 'auto'; // Or back to initial min-height
        }
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
    <div className="flex items-start gap-2 border-t bg-card p-2 sm:p-3 md:p-4">
      <Textarea
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring"
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto'; // Reset height to correctly calculate scrollHeight
          target.style.height = `${Math.min(target.scrollHeight, currentMaxHeight)}px`;
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
