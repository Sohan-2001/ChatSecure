
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
  child, // for push
  limitToLast // for message fetching, if needed later
} from 'firebase/database'; // RTDB imports
import type { ChatMessage, UserProfile, ChatRoom } from '@/types';

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
            // lastMessage will be set when first message is sent
          };
          // Explicitly type what's being set to include serverTimestamp()
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
    const messagesRef = query(ref(db, `chatRooms/${chatId}/messages`), orderByChild('timestamp')); // Order by timestamp

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const fetchedMessages = Object.keys(messagesData).map(key => ({
          id: key,
          ...messagesData[key],
        } as ChatMessage));
        // RTDB orderByChild sorts ascending, which is what we want.
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
      timestamp: serverTimestamp(), // RTDB server timestamp
    };

    try {
      const newMessageRef = push(messagesListRef); // Generates a unique key for the message
      await set(newMessageRef, newMessageData);
      
      // Update chat room metadata (last message and updatedAt)
      const updates: Partial<ChatRoom> & {updatedAt: object, lastMessage: Omit<ChatMessage, 'id'> & {timestamp: object}} = {
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
      <MessageList messages={messages} contactUser={contactUser} loadingMessages={loadingMessages} />
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}
