import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function ChatWidget() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get recent chats
  const { data: recentChats = [] } = trpc.chat.getRecentChats.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  // Get messages for selected user
  const { data: messages = [] } = trpc.chat.getMessages.useQuery(
    { contactId: selectedUserId || 0 },
    { enabled: !!selectedUserId && !!user }
  );

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      // Refetch messages
      trpc.useUtils().chat.getMessages.invalidate();
      trpc.useUtils().chat.getRecentChats.invalidate();
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserId || !user) return;

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        recipientId: selectedUserId,
        message: messageText,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-96 gap-4">
      {/* Chats List */}
      <div className="w-40 border-r border-border">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">CHOFERES</p>
        </div>
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {recentChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin conversaciones
              </p>
            ) : (
              recentChats.map((chat: any) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedUserId(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedUserId === chat.id
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <p className="font-medium truncate">{chat.name}</p>
                  {chat.unreadCount > 0 && (
                    <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 inline-block mt-1">
                      {chat.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Sin mensajes. ¡Comienza una conversación!
                  </p>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderId === user?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={isLoading || !messageText.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Selecciona un chofer para chatear</p>
          </div>
        )}
      </div>
    </div>
  );
}
