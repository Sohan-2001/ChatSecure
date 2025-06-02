
import type { User as FirebaseUser } from 'firebase/auth';
// Removed Firestore Timestamp import

export type { FirebaseUser };

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string; 
  text: string;
  timestamp: number | object; // RTDB serverTimestamp is an object placeholder, resolves to number (ms since epoch)
}

export interface ChatRoom {
  id: string;
  participants: string[]; 
  participantEmails: string[]; 
  lastMessage?: ChatMessage; // Timestamp within lastMessage will also be a number when read
  updatedAt: number | object; // RTDB serverTimestamp, resolves to number
}
