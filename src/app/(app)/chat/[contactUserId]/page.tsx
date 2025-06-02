
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
  remove, // For deleting messages
  // limitToLast // for message fetching, if needed later
} from 'firebase/database'; // RTDB imports
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

  // Fetch contact user profile
  useEffect(() => {
    if (!contactUserId) return;
    const fetchContactUser = async () => {
      const userRef = ref(db, `users/${contactUserId}`);
      try {
        const snapshot = await get(userRef);
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

  // Determine chatId and create chat room if not exists
  useEffect(() => {
    if (!currentUser || !contactUser) return;

    const currentChatId = getChatId(currentUser.uid, contactUser.uid);
    setChatId(currentChatId);

    const setupChatRoom = async () => {
      const chatRoomRef = ref(db, `chatRooms/${currentChatId}`);
      try {
        const snapshot = await get(chatRoomRef);
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
          await set(chatRoomRef, newChatRoomWithTimestamp);
        }
      } catch (error) {
        console.error("Error creating/checking chat room in RTDB:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not initialize chat." });
      }
      setLoadingChatInfo(false);
    };

    setupChatRoom();

  }, [currentUser, contactUser, getChatId, toast]);


  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;
    setLoadingMessages(true);
    const messagesRef = query(ref(db, `chatRooms/${chatId}/messages`), orderByChild('timestamp'));

    const unsubscribe = onValue(messagesRef, (snapshot) => {
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

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !chatId || !contactUser) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send message. User or chat not properly initialized." });
      return;
    }

    const messagesListRef = ref(db, `chatRooms/${chatId}/messages`);
    const chatRoomMetaRef = ref(db, `chatRooms/${chatId}`);

    const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: object } = {
      senderId: currentUser.uid,
      senderEmail: currentUser.email || 'Unknown User',
      text,
      timestamp: serverTimestamp(),
    };

    try {
      const newMessageRef = push(messagesListRef);
      await set(newMessageRef, newMessageData);

      const updates: Partial<ChatRoom> & {updatedAt: object, lastMessage: Omit<ChatMessage, 'id' | 'isEdited' | 'editedAt'> & {timestamp: object}} = {
        lastMessage: {
          text: newMessageData.text,
          senderId: newMessageData.senderId,
          senderEmail: newMessageData.senderEmail,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };
      await update(chatRoomMetaRef, updates);

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
    const messageRef = ref(db, `chatRooms/${chatId}/messages/${messageId}`);
    const chatRoomMetaRef = ref(db, `chatRooms/${chatId}`);

    try {
      // Check if the message to be deleted is the current lastMessage
      const currentMessageToDelete = messages.find(m => m.id === messageId);
      const chatRoomSnapshot = await get(chatRoomMetaRef);
      let isLastMessage = false;
      if (chatRoomSnapshot.exists()) {
        const chatRoomData = chatRoomSnapshot.val() as ChatRoom;
        // Compare based on message text and senderId as timestamp might be slightly different due to serverTimestamp resolution
        if (chatRoomData.lastMessage && 
            chatRoomData.lastMessage.text === currentMessageToDelete?.text &&
            chatRoomData.lastMessage.senderId === currentMessageToDelete?.senderId) {
          isLastMessage = true;
        }
      }
      
      await remove(messageRef);

      if (isLastMessage) {
        // Find the new last message from the remaining messages
        const remainingMessages = messages.filter(m => m.id !== messageId).sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
        const newLastMessage = remainingMessages.length > 0 ? remainingMessages[remainingMessages.length - 1] : null;
        
        if (newLastMessage) {
          await update(chatRoomMetaRef, {
            lastMessage: {
              text: newLastMessage.text,
              senderId: newLastMessage.senderId,
              senderEmail: newLastMessage.senderEmail,
              timestamp: newLastMessage.timestamp // Use existing timestamp of the new last message
            },
            updatedAt: serverTimestamp()
          });
        } else {
          // No messages left, clear lastMessage
          await update(chatRoomMetaRef, {
            lastMessage: null,
            updatedAt: serverTimestamp()
          });
        }
      }
      toast({ title: "Success", description: "Message deleted." });
    } catch (error) {
      console.error("Error deleting message from RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete message." });
      throw error; // Re-throw to be caught by MessageItem
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
     if (!currentUser || !chatId) {
      toast({ variant: "destructive", title: "Error", description: "Cannot edit message. Missing information." });
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
        return; // Don't proceed with edit
      }

      const messageRef = ref(db, `chatRooms/${chatId}/messages/${messageId}`);
      const chatRoomMetaRef = ref(db, `chatRooms/${chatId}`);

      const updates = {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp()
      };
      await update(messageRef, updates);

      // Check if this message is the lastMessage
      const chatRoomSnapshot = await get(chatRoomMetaRef);
      if (chatRoomSnapshot.exists()) {
        const chatRoomData = chatRoomSnapshot.val() as ChatRoom;
         // We need to compare by original timestamp or a more robust ID if available for lastMessage
         // For now, we'll assume if the message ID matches one that *could* be the last one, we update
         // This is a simplification; robust last message tracking on edit might require more.
         // We will update if its text matches current last message text
         // A better approach would be to store messageId in lastMessage, but that's a larger schema change.
        if (chatRoomData.lastMessage && chatRoomData.lastMessage.senderId === currentUser.uid) { // only update if current user sent the last message
             const originalMessage = messages.find(m => m.id === messageId);
             if (originalMessage && originalMessage.text === chatRoomData.lastMessage.text) {
                 await update(chatRoomMetaRef, {
                    'lastMessage/text': newText,
                    'lastMessage/timestamp': serverTimestamp(), // Update timestamp to reflect edit time as "last activity"
                    updatedAt: serverTimestamp()
                });
             }
        }
      }
      toast({ title: "Success", description: "Message edited." });
    } catch (error) {
      console.error("Error editing message in RTDB:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to edit message." });
      throw error; // Re-throw to be caught by MessageItem
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
