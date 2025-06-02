
"use client";

import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Trash2, Edit3, Save, XCircle, Loader2, MessageSquareX, Copy } from "lucide-react";
import { format } from 'date-fns';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import NextImage from "next/image";
import { useAuth } from "@/hooks/use-auth";

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUserMessage: boolean;
  senderProfile?: { email: string | null, photoURL?: string | null };
  onDelete: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, newText: string) => Promise<void>;
}

export function MessageItem({ message, isCurrentUserMessage, senderProfile, onDelete, onEdit }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditedText(message.text || "");
  }, [message.text]);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const formattedTimestamp = typeof message.timestamp === 'number' ?
    format(new Date(message.timestamp), 'p')
    : 'sending...';

  const formattedEditedAt = message.isEdited && typeof message.editedAt === 'number' ?
    format(new Date(message.editedAt), 'p')
    : null;

  const handleSaveEdit = async () => {
    if (editedText.trim() === (message.text || "")) {
      setIsEditing(false);
      return;
    }
    if (!editedText.trim() && !message.imageUrl) {
      toast({ variant: "destructive", title: "Error", description: "Message text cannot be empty." });
      return;
    }
    setIsProcessingEdit(true);
    try {
      await onEdit(message.id, editedText.trim());
      setIsEditing(false);
    } catch (error) {
      // Toast is handled by onEdit typically
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsProcessingDelete(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false); // Close dialog on success
    } catch (error) {
      // Toast handled by onDelete
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!message.text) {
      toast({
        variant: "destructive",
        title: "Nothing to Copy",
        description: "This message does not contain any text.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(message.text);
      toast({
        title: "Copied!",
        description: "Message text copied to clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy message: ', err);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy message to clipboard.",
      });
    }
  };

  const isSenderViewingOwnMessage = currentUser?.uid === message.senderId;
  const canEdit = isSenderViewingOwnMessage && (message.text || !message.imageUrl); // Can edit if sender and there's text, or if it's an image-only message (to add text)

  if (message.deletedFor && message.deletedFor[currentUser?.uid || '']) {
    return (
      <div
        className={cn(
          "group flex items-start gap-2 py-2 px-1",
          isCurrentUserMessage ? "justify-end" : "justify-start"
        )}
      >
        {!isCurrentUserMessage && (
          <Avatar className="h-8 w-8 invisible">
             <AvatarFallback></AvatarFallback>
          </Avatar>
        )}
         <div className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-2 shadow-sm text-xs italic",
            isCurrentUserMessage ? "bg-muted text-muted-foreground" : "border bg-card text-muted-foreground"
          )}>
            <MessageSquareX className="h-3 w-3 mr-1 shrink-0" />
            You deleted this message.
          </div>
        {isCurrentUserMessage && (
           <Avatar className="h-8 w-8 invisible">
             <AvatarFallback></AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }


  return (
    <div
      className={cn(
        "group flex items-start gap-2 py-2 px-1",
        isCurrentUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={senderProfile?.photoURL || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {getInitials(senderProfile?.email)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex items-start gap-1">
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity order-first data-[state=open]:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUserMessage ? "end" : "start"}>
              {message.text && (
                <DropdownMenuItem onClick={handleCopyMessage}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Text
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => { setIsEditing(true); setEditedText(message.text || ""); }}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Text
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div
          className={cn(
            "max-w-[70%] rounded-xl px-3 py-2 shadow-md min-w-[80px]",
            isCurrentUserMessage
              ? "rounded-br-none bg-blue-500 text-white"
              : "rounded-bl-none bg-gray-200 text-card-foreground border"
          )}
        >
          {isEditing && canEdit ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="text-sm bg-background/10 text-white focus-visible:ring-white placeholder-white/70"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isProcessingEdit} className="text-white hover:bg-white/10 hover:text-white h-auto px-2 py-1">
                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveEdit} disabled={isProcessingEdit || (!editedText.trim() && !message.imageUrl) || editedText.trim() === (message.text || "")} className="bg-white text-blue-500 hover:bg-gray-200 h-auto px-2 py-1">
                  {isProcessingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.imageUrl && (
                <div className="relative w-full max-w-md rounded-md overflow-hidden mb-1">
                  <NextImage
                    src={message.imageUrl}
                    alt="Sent image"
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    className="bg-muted rounded-md"
                    data-ai-hint="chat image"
                    unoptimized={true} 
                    priority={false} 
                  />
                </div>
              )}
              {message.text && <p className="text-sm break-words whitespace-pre-wrap mb-1">{message.text}</p>}
              <div className="flex items-center justify-end">
                {message.isEdited && (
                  <span className={cn(
                    "text-xs mr-1",
                    isCurrentUserMessage ? "text-white/70" : "text-muted-foreground/80"
                  )}>(edited {formattedEditedAt && `at ${formattedEditedAt}`})</span>
                )}
                <p className={cn(
                  "text-xs",
                  isCurrentUserMessage ? "text-white/70" : "text-muted-foreground"
                )}>
                  {formattedTimestamp}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {isCurrentUserMessage && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.photoURL || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {getInitials(currentUser?.email)}
          </AvatarFallback>
        </Avatar>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSenderViewingOwnMessage ? "Delete Message for Everyone?" : "Delete Message for You?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSenderViewingOwnMessage
                ? "This will permanently delete the message for all participants in this chat."
                : "This message will be hidden from your view. Other participants may still see it."}
              <br />This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingDelete}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isProcessingDelete}>
              {isProcessingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSenderViewingOwnMessage ? "Delete for Everyone" : "Delete for Me"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
