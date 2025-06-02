
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
  text?: string;
  imageUrl?: string;
  timestamp: number | object;
  isEdited?: boolean;
  editedAt?: number | object;
  deletedFor?: { [userId: string]: true }; // Added for "Delete for me"
}

export interface ChatRoom {
  id: string;
  participants: string[];
  participantEmails: string[];
  lastMessage?: ChatMessage;
  updatedAt: number | object;
}
