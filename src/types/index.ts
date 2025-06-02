import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type { FirebaseUser };

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null; // Optional: can be added later
  photoURL?: string | null; // Optional
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string; // For display purposes
  text: string;
  timestamp: Timestamp | Date; // Firestore serverTimestamp will be Timestamp, Date for client-side objects
}

export interface ChatRoom {
  id: string;
  participants: string[]; // Array of UIDs
  participantEmails: string[]; // Array of emails
  lastMessage?: ChatMessage;
  updatedAt: Timestamp | Date;
}
