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
}

export function ChatWidget() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Queries seguras
  const { data: recentChats } = trpc.chat.getRecentChats.useQuery(
    { limit: 50 },
    { enabled: !!user, retry: false }
  );

  const { data: messages } = trpc.chat.getMessages.useQuery(
    { contactId: selectedUserId || 0 },
    { enabled: !!selectedUserId && !!user, retry: false }
  );

  const safeChats = Array.isArray(recentChats) ? recentChats : [];
  const safeMessages = Array.isArray(messages) ? messages : [];

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.chat.getMessages.invalidate();
      utils.chat.getRecentChats.invalidate();
    },
    onError: (err) => {
      console.error("Chat send error:", err);
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

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [safeMessages]);

  // Filtro seguro
  const filteredChats = safeChats.filter((chat: ChatUser) =>
    (chat.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = safeChats.reduce(
    (sum, chat) => sum + (chat.unreadCount || 0),
    0
  );

  return (
    <div className="flex h-96 gap-4 bg-card rounded-lg border overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="flex justify-between mb-2">
            <p className="text-xs font-semibold">CHOFERES</p>
            {totalUnread > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredChats.length === 0 ? (
              <p className="text-xs text-center py-4">
                {searchQuery ? "Sin resultados" : "Sin conversaciones"}
              </p>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedUserId(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                    selectedUserId === chat.id
                      ? "bg-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex gap-2">
                    <Circle
                      className={`h-2 w-2 mt-1 ${
                        chat.isOnline ? "text-green-500" : "text-gray-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="truncate">{chat.name}</p>
                      {chat.unreadCount ? (
                        <span className="text-xs bg-red-500 text-white px-1 rounded">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            {/* Header */}
            <div className="border-b p-3">
              <p className="text-sm font-semibold">
                {safeChats.find((c) => c.id === selectedUserId)?.name || "Chat"}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
              {safeMessages.length === 0 ? (
                <p className="text-center text-sm py-8">
                  Sin mensajes
                </p>
              ) : (
                safeMessages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div className="max-w-xs px-3 py-2 rounded-lg text-sm bg-muted">
                      {msg.content || ""}
                      <p className="text-xs mt-1 opacity-70">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString()
                          : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                {isLoading ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm">
            Selecciona un chofer
          </div>
        )}
      </div>
    </div>
  );
}
