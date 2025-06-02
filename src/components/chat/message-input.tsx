
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Loader2, Paperclip, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { moderateMessage } from "@/ai/flows/moderate-message";
import NextImage from "next/image"; // Renamed to avoid conflict with DOM Image

interface MessageInputProps {
  onSendMessage: (text: string, imageDataUrl?: string | null) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const [currentMaxHeight, setCurrentMaxHeight] = useState(120);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateMaxHeight = () => {
      const newMaxHeight = window.innerWidth >= 768 ? 200 : 120;
      setCurrentMaxHeight(newMaxHeight);
    };

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please select an image file." });
      setSelectedImageDataUrl(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedImageDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessageInternal = async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText && !selectedImageDataUrl) return;

    setIsSending(true);
    try {
      if (trimmedText) {
        const moderationResult = await moderateMessage({ message: trimmedText });
        if (!moderationResult.isSafe) {
          toast({
            variant: "destructive",
            title: "Message Not Sent",
            description: moderationResult.reason || "Your message was flagged by our content moderation system.",
          });
          setIsSending(false);
          return;
        }
      }

      await onSendMessage(trimmedText, selectedImageDataUrl);
      setMessageText("");
      removeSelectedFile();

      const textarea = document.querySelector('textarea[placeholder="Type your message..."]');
      if (textarea) {
        (textarea as HTMLTextAreaElement).style.height = 'auto';
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
      handleSendMessageInternal();
    }
  };

  return (
    <div className="border-t bg-card p-2 sm:p-3 md:p-4">
      {selectedImageDataUrl && (
        <div className="mb-2 relative w-24 h-24 border rounded-md overflow-hidden">
          <NextImage src={selectedImageDataUrl} alt="Preview" fill style={{ objectFit: "cover" }} unoptimized={true} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-6 w-6 bg-black/50 text-white hover:bg-black/70"
            onClick={removeSelectedFile}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-start gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isSending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="Attach image"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 resize-none rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, currentMaxHeight)}px`;
          }}
          disabled={isSending}
        />
        <Button
          onClick={handleSendMessageInternal}
          disabled={isSending || (!messageText.trim() && !selectedImageDataUrl)}
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
    </div>
  );
}
