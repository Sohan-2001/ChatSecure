"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  where,
  limit,
  setDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
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
      const userDocRef = doc(db, 'users', contactUserId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setContactUser(userDocSnap.data() as UserProfile);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Contact user not found.' });
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
      const chatRoomRef = doc(db, 'chatRooms', currentChatId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      if (!chatRoomSnap.exists()) {
        const newChatRoom: ChatRoom = {
          id: currentChatId,
          participants: [currentUser.uid, contactUser.uid],
          participantEmails: [currentUser.email || '', contactUser.email || ''],
          updatedAt: serverTimestamp() as Timestamp,
        };
        try {
          await setDoc(chatRoomRef, newChatRoom);
        } catch (error) {
          console.error("Error creating chat room:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not initialize chat." });
        }
      }
      setLoadingChatInfo(false);
    };

    setupChatRoom();
    
  }, [currentUser, contactUser, getChatId, toast]);


  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;
    setLoadingMessages(true);
    const messagesColRef = collection(db, 'chatRooms', chatId, 'messages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ChatMessage));
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
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

    const messagesColRef = collection(db, 'chatRooms', chatId, 'messages');
    const chatRoomRef = doc(db, 'chatRooms', chatId);
    
    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
      senderId: currentUser.uid,
      senderEmail: currentUser.email || 'Unknown User',
      text,
      timestamp: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      const messageDocRef = doc(messagesColRef); // Auto-generate ID for new message
      batch.set(messageDocRef, newMessage);
      batch.update(chatRoomRef, { 
        lastMessage: { 
          text: newMessage.text, 
          senderId: newMessage.senderId,
          timestamp: newMessage.timestamp // This will be a server timestamp placeholder
        },
        updatedAt: serverTimestamp() 
      });
      await batch.commit();
    } catch (error) {
      console.error("Error sending message:", error);
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
