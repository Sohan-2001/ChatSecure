import { MessageSquareDashed } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <MessageSquareDashed className="mb-6 h-24 w-24 text-primary/30" />
      <h2 className="font-headline text-2xl font-semibold text-foreground">
        Select a conversation
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        Search for users by their email in the sidebar and click on a user to start chatting or view your existing conversations.
      </p>
    </div>
  );
}
