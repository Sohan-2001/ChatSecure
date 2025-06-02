
"use client";

import { useState, useEffect, useMemo } from 'react';
import { ref, query, orderByChild, onValue, get } from 'firebase/database'; // RTDB imports
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '../ui/skeleton';

interface UserSearchAndListProps {
  onUserSelect?: (userId: string) => void;
}

export function UserSearchAndList({ onUserSelect }: UserSearchAndListProps) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!currentUser) return;

    console.log('UserSearchAndList: Current user:', currentUser);
    setLoading(true);
    const usersRef = ref(db, 'users');
    // Query users, order by email. Current user will be filtered out client-side.
    const usersQuery = query(usersRef, orderByChild('email'));
    
    const unsubscribe = onValue(usersQuery, (snapshot) => {
      if (snapshot.exists()) {
        const usersDataObj = snapshot.val();
        const usersData = Object.keys(usersDataObj)
          .map(key => ({ ...usersDataObj[key], uid: key } as UserProfile)) // Ensure uid is part of the object
          .filter(userToList => userToList.uid !== currentUser.uid); // Filter out current user
        
        console.log('UserSearchAndList: Fetched and filtered users data from RTDB:', usersData);
        setAllUsers(usersData);
      } else {
        setAllUsers([]);
        console.log('UserSearchAndList: No users found in RTDB.');
      }
      setLoading(false);
    }, (error) => {
      console.error("UserSearchAndList: Error fetching users from RTDB:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    return allUsers.filter(user =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allUsers]);

  console.log('UserSearchAndList: Filtered users for display:', filteredUsers);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  const isActiveChat = (userId: string) => {
    return pathname === `/chat/${userId}`;
  };

  if (!currentUser && loading) { // Show loader if current user not loaded yet AND still loading users list
    return (
      <div className="p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 rounded-md p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!currentUser) {
     return <div className="p-4 text-muted-foreground">Authenticating user...</div>;
  }


  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users by email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 rounded-md p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <ul className="divide-y divide-border">
            {filteredUsers.map((userToList) => (
              <li key={userToList.uid}>
                <Link href={`/chat/${userToList.uid}`} passHref legacyBehavior>
                  <a
                    onClick={() => onUserSelect?.(userToList.uid)}
                    className={`flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors ${isActiveChat(userToList.uid) ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userToList.photoURL || undefined} alt={userToList.email || 'User'} />
                      <AvatarFallback className={isActiveChat(userToList.uid) ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                        {getInitials(userToList.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate">{userToList.displayName || userToList.email}</p>
                      {userToList.displayName && <p className="text-xs text-muted-foreground truncate">{userToList.email}</p>}
                    </div>
                    <MessageCircle className={`h-5 w-5 ${isActiveChat(userToList.uid) ? 'text-primary' : 'text-muted-foreground'}`} />
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-center text-muted-foreground">No users found.</p>
        )}
      </ScrollArea>
    </div>
  );
}
