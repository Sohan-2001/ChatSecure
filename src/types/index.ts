
import type { User as FirebaseUser } from 'firebase/auth';

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
  text?: string; // Text is now optional
  imageUrl?: string; // To store the URL of the sent image
  timestamp: number | object;
  isEdited?: boolean;
  editedAt?: number | object;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  participantEmails: string[];
  lastMessage?: ChatMessage; 
  updatedAt: number | object;
}
