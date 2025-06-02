"use client";
import { AppHeader } from '@/components/chat/app-header';
import { UserSearchAndList } from '@/components/chat/user-search-and-list';
import { Sidebar, SidebarContent, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import type { ReactNode } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar(); // Access setOpenMobile from context

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsible="icon" variant="sidebar" className="hidden md:flex md:flex-col">
          <SidebarContent className="p-0">
            <UserSearchAndList />
          </SidebarContent>
        </Sidebar>
        {/* Mobile sidebar content handled by Sidebar component's Sheet */}
         <Sidebar collapsible="offcanvas" variant="sidebar" side="left" className="md:hidden">
          <SidebarContent className="p-0">
             <UserSearchAndList onUserSelect={() => setOpenMobile(false)} />
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1">
           <div className="h-full w-full overflow-y-auto">
             {children}
           </div>
        </SidebarInset>
      </div>
    </div>
  );
}
