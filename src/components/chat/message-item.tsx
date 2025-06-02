
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
import { MoreHorizontal, Trash2, Edit3, Save, XCircle, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import NextImage from "next/image";

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUserMessage: boolean;
  senderProfile?: { email: string | null, photoURL?: string | null };
  onDelete: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, newText: string) => Promise<void>;
}

export function MessageItem({ message, isCurrentUserMessage, senderProfile, onDelete, onEdit }: MessageItemProps) {
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
      setShowDeleteConfirm(false);
    } catch (error) {
      // Toast is handled by onDelete typically
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const canEdit = message.text || !message.imageUrl;

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
      <div className="flex items-start gap-1"> {/* Changed from items-end */}
        {isCurrentUserMessage && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              ? "rounded-br-none bg-primary text-primary-foreground"
              : "rounded-bl-none bg-card text-card-foreground border"
          )}
        >
          {isEditing && canEdit ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="text-sm bg-background/10 text-primary-foreground focus-visible:ring-primary-foreground placeholder-primary-foreground/70"
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
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isProcessingEdit} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-auto px-2 py-1">
                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveEdit} disabled={isProcessingEdit || (!editedText.trim() && !message.imageUrl) || editedText.trim() === (message.text || "")} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-auto px-2 py-1">
                  {isProcessingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.imageUrl && (
                <div className="relative w-full max-w-md rounded-md overflow-hidden my-1">
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
              {message.text && <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>}
              <div className="flex items-center justify-end mt-1">
                {message.isEdited && (
                  <span className={cn(
                    "text-xs mr-1",
                    isCurrentUserMessage ? "text-primary-foreground/70" : "text-muted-foreground/80"
                  )}>(edited {formattedEditedAt && `at ${formattedEditedAt}`})</span>
                )}
                <p className={cn(
                  "text-xs",
                  isCurrentUserMessage ? "text-primary-foreground/70" : "text-muted-foreground"
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
          <AvatarImage src={senderProfile?.photoURL || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {getInitials(senderProfile?.email)}
          </AvatarFallback>
        </Avatar>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingDelete}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isProcessingDelete}>
              {isProcessingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
