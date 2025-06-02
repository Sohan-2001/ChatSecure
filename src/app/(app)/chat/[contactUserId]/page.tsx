
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import {
  ref,
  query,
  orderByChild,
  onValue,
  push,
  serverTimestamp,
  get,
  set,
  update,
  remove,
} from 'firebase/database';
import type { ChatMessage, UserProfile, ChatRoom } from '@/types';
import { moderateMessage } from "@/ai/flows/moderate-message";

import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ConversationPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const contactUserId = params.contactUserId as string;

  const [contactUser, setContactUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loadingChatInfo, setLoadingChatInfo] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const getChatId = useCallback((uid1: string, uid2: string): string => {
    return [uid1, uid2].sort().join('_');
  }, []);

  useEffect(() => {
    if (!contactUserId) return;
    const fetchContactUser = async () => {
      const userRefDb = ref(db, `users/${contactUserId}`);
      try {
        const snapshot = await get(userRefDb);
        if (snapshot.exists()) {
          setContactUser({ ...snapshot.val(), uid: contactUserId } as UserProfile);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Contact user not found.' });
          router.push('/chat');
        }
      } catch (error) {
        console.error("Error fetching contact user from RTDB:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load contact details.' });
        router.push('/chat');
      }
    };
    fetchContactUser();
  }, [contactUserId, router, toast]);

  useEffect(() => {
    if (!currentUser || !contactUser) return;

    const currentChatId = getChatId(currentUser.uid, contactUser.uid);
    setChatId(currentChatId);

    const setupChatRoom = async () => {
      const chatRoomRefDb = ref(db, `chatRooms/${currentChatId}`);
      try {
        const snapshot = await get(chatRoomRefDb);
        if (!snapshot.exists()) {
          const newChatRoomData: Omit<ChatRoom, 'id' | 'updatedAt'> & { updatedAt: object } = {
            participants: [currentUser.uid, contactUser.uid],
            participantEmails: [currentUser.email || '', contactUser.email || ''],
          };
          const newChatRoomWithTimestamp: ChatRoom = {
            id: currentChatId,
            ...newChatRoomData,
            updatedAt: serverTimestamp(),
          };
          await set(chatRoomRefDb, newChatRoomWithTimestamp);
        }
      } catch (error) {
        console.error("Error creating/checking chat room in RTDB:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not initialize chat." });
      }
      setLoadingChatInfo(false);
    };

    setupChatRoom();

  }, [currentUser, contactUser, getChatId, toast]);


  useEffect(() => {
    if (!chatId) return;
    setLoadingMessages(true);
    const messagesRefDb = query(ref(db, `chatRooms/${chatId}/messages`), orderByChild('timestamp'));

    const unsubscribe = onValue(messagesRefDb, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const fetchedMessages = Object.keys(messagesData).map(key => ({
          id: key,
          ...messagesData[key],
        } as ChatMessage));
        setMessages(fetchedMessages);
      } else {
        setMessages([]);
      }
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages from RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load messages." });
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [chatId, toast]);

  const handleSendMessage = async (text: string, imageDataUrl?: string | null) => {
    if (!currentUser || !chatId || !contactUser) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send message. User or chat not properly initialized." });
      return;
    }
    if (!text && !imageDataUrl) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send an empty message." });
      return;
    }

    const messagesListRefDb = ref(db, `chatRooms/${chatId}/messages`);
    const chatRoomMetaRefDb = ref(db, `chatRooms/${chatId}`);
    
    const newMessageData: Omit<ChatMessage, 'id' | 'timestamp' | 'deletedFor'> & { timestamp: object } = {
      senderId: currentUser.uid,
      senderEmail: currentUser.email || 'Unknown User',
      timestamp: serverTimestamp(),
    };

    if (text) {
      newMessageData.text = text;
    }
    if (imageDataUrl) {
      newMessageData.imageUrl = imageDataUrl;
    }

    try {
      const newMessageRef = push(messagesListRefDb);
      await set(newMessageRef, newMessageData);
      
      let lastMessageText = "[Image]";
      if (text) lastMessageText = text;
      else if (imageDataUrl && !text) lastMessageText = "[Image]";

      const updates: Partial<ChatRoom> & {updatedAt: object, lastMessage: Omit<ChatMessage, 'id' | 'isEdited' | 'editedAt' | 'deletedFor'> & {timestamp: object}} = {
        lastMessage: {
          text: lastMessageText,
          imageUrl: imageDataUrl,
          senderId: newMessageData.senderId,
          senderEmail: newMessageData.senderEmail,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };
      await update(chatRoomMetaRefDb, updates);

    } catch (error) {
      console.error("Error sending message to RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send message." });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser || !chatId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot delete message. Missing information." });
      return;
    }
    const messageRefDb = ref(db, `chatRooms/${chatId}/messages/${messageId}`);
    const chatRoomMetaRefDb = ref(db, `chatRooms/${chatId}`);

    const messageToDelete = messages.find(m => m.id === messageId);
    if (!messageToDelete) {
        toast({ variant: "destructive", title: "Error", description: "Message not found." });
        return;
    }

    try {
      if (messageToDelete.senderId === currentUser.uid) {
        // Sender deletes: Delete for everyone
        const chatRoomSnapshot = await get(chatRoomMetaRefDb);
        let isLastMessage = false;
        if (chatRoomSnapshot.exists()) {
          const chatRoomData = chatRoomSnapshot.val() as ChatRoom;
          if (chatRoomData.lastMessage && 
              ((chatRoomData.lastMessage.text === messageToDelete.text) || (messageToDelete.imageUrl && chatRoomData.lastMessage.imageUrl === messageToDelete.imageUrl)) && 
              chatRoomData.lastMessage.senderId === messageToDelete.senderId) {
            isLastMessage = true;
          }
        }
        
        await remove(messageRefDb);

        if (isLastMessage) {
          const remainingMessages = messages.filter(m => m.id !== messageId).sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
          const newLastMessage = remainingMessages.length > 0 ? remainingMessages[remainingMessages.length - 1] : null;
          
          if (newLastMessage) {
            await update(chatRoomMetaRefDb, {
              lastMessage: {
                text: newLastMessage.text || (newLastMessage.imageUrl ? "[Image]" : ""),
                imageUrl: newLastMessage.imageUrl,
                senderId: newLastMessage.senderId,
                senderEmail: newLastMessage.senderEmail,
                timestamp: newLastMessage.timestamp
              },
              updatedAt: serverTimestamp()
            });
          } else {
            await update(chatRoomMetaRefDb, {
              lastMessage: null,
              updatedAt: serverTimestamp()
            });
          }
        }
        toast({ title: "Success", description: "Message deleted for everyone." });

      } else {
        // Receiver deletes: Delete for me
        const updates = {
          [`deletedFor/${currentUser.uid}`]: true
        };
        await update(messageRefDb, updates);
        toast({ title: "Success", description: "Message deleted for you." });
      }
    } catch (error) {
      console.error("Error deleting message from RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete message." });
      throw error; // Re-throw to allow MessageItem to handle UI state
    }
  };


  const handleEditMessage = async (messageId: string, newText: string) => {
     if (!currentUser || !chatId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot edit message. Missing information." });
      return;
    }
    const originalMessage = messages.find(m => m.id === messageId);
    if (!originalMessage || (originalMessage.imageUrl && !newText.trim())) {
        toast({ variant: "destructive", title: "Error", description: "Cannot remove text from an image message if it's the only content part to edit." });
        return;
    }
    if (originalMessage.senderId !== currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "You can only edit your own messages." });
      return;
    }

    try {
      const moderationResult = await moderateMessage({ message: newText });
      if (!moderationResult.isSafe) {
        toast({
          variant: "destructive",
          title: "Message Not Edited",
          description: moderationResult.reason || "Your edited message was flagged by our content moderation system.",
        });
        return;
      }

      const messageRefDb = ref(db, `chatRooms/${chatId}/messages/${messageId}`);
      const chatRoomMetaRefDb = ref(db, `chatRooms/${chatId}`);

      const updates = {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp()
      };
      await update(messageRefDb, updates);

      const chatRoomSnapshot = await get(chatRoomMetaRefDb);
      if (chatRoomSnapshot.exists()) {
        const chatRoomData = chatRoomSnapshot.val() as ChatRoom;
        if (chatRoomData.lastMessage && chatRoomData.lastMessage.senderId === currentUser.uid) {
             const originalLastMessageText = originalMessage?.text || (originalMessage?.imageUrl ? "[Image]" : "");
             if (chatRoomData.lastMessage.text === originalLastMessageText || chatRoomData.lastMessage.imageUrl === originalMessage?.imageUrl) {
                 await update(chatRoomMetaRefDb, {
                    'lastMessage/text': newText || (originalMessage.imageUrl ? "[Image]" : ""), 
                    'lastMessage/timestamp': serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
             }
        }
      }
      toast({ title: "Success", description: "Message edited." });
    } catch (error) {
      console.error("Error editing message in RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to edit message." });
      throw error;
    }
  };

  if (authLoading || loadingChatInfo || !contactUser) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-screen flex-col bg-background">
      <ChatHeader contactUser={contactUser} />
      <MessageList
        messages={messages}
        contactUser={contactUser}
        loadingMessages={loadingMessages}
        onDeleteMessage={handleDeleteMessage}
        onEditMessage={handleEditMessage}
      />
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
