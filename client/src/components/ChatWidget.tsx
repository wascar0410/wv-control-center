import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Search, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ChatUser {
  id: number;
  name: string;
  unreadCount?: number;
  isOnline?: boolean;
  lastSeen?: Date;
}

export function ChatWidget() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get recent chats
  const { data: recentChats = [] } = trpc.chat.getRecentChats.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  // Get messages for selected user
  const { data: messages = [] } = trpc.chat.getMessages.useQuery(
    { contactId: selectedUserId || 0 },
    { enabled: !!selectedUserId && !!user }
  );

  // Get unread count
  const { data: unreadCount = 0 } = trpc.chat.getUnreadCount.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      trpc.useUtils().chat.getMessages.invalidate();
      trpc.useUtils().chat.getRecentChats.invalidate();
      trpc.useUtils().chat.getUnreadCount.invalidate();
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

  // Filter chats based on search
  const filteredChats = recentChats.filter((chat: ChatUser) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get total unread messages
  const totalUnread = recentChats.reduce(
    (sum: number, chat: ChatUser) => sum + (chat.unreadCount || 0),
    0
  );

  return (
    <div className="flex h-96 gap-4 bg-card rounded-lg border border-border overflow-hidden">
      {/* Chats List */}
      <div className="w-48 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">CHOFERES</p>
            {totalUnread > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {searchQuery ? "Sin resultados" : "Sin conversaciones"}
              </p>
            ) : (
              filteredChats.map((chat: ChatUser) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedUserId(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors relative group ${
                    selectedUserId === chat.id
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Online indicator */}
                    <div className="relative mt-0.5">
                      <Circle
                        className={`h-2 w-2 ${
                          chat.isOnline
                            ? "fill-green-500 text-green-500"
                            : "fill-gray-500 text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.name}</p>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="text-xs bg-red-500 text-white rounded-full px-1 py-0.5 inline-block mt-0.5">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
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
            {/* Header */}
            <div className="border-b border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {recentChats.find((c: ChatUser) => c.id === selectedUserId)?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {recentChats.find((c: ChatUser) => c.id === selectedUserId)?.isOnline
                    ? "En línea"
                    : "Desconectado"}
                </p>
              </div>
            </div>

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
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm break-words ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.content}
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing indicator */}
                {typingUsers.has(selectedUserId) && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground px-3 py-2 rounded-lg text-sm">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
                        <span
                          className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></span>
                        <span
                          className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></span>
                      </div>
                    </div>
                  </div>
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
