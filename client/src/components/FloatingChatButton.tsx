import React, { useState } from "react";
import { MessageCircle, X, Send, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function FloatingChatButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Get recent chats
  const { data: recentChats = [] } = trpc.chat.getRecentChats.useQuery(
    { limit: 50 },
    { enabled: !!user && isOpen }
  );

  // Get messages for selected user
  const { data: messages = [] } = trpc.chat.getMessages.useQuery(
    { contactId: selectedUserId || 0 },
    { enabled: !!selectedUserId && !!user && isOpen }
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
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Filter chats
  const filteredChats = recentChats.filter((chat: any) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get total unread
  const totalUnread = recentChats.reduce(
    (sum: number, chat: any) => sum + (chat.unreadCount || 0),
    0
  );

  if (!user || user.role !== "admin") return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
        aria-label="Abrir chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-96 bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Chat con Choferes</h3>
              <p className="text-xs opacity-90">
                {selectedUserId
                  ? recentChats.find((c: any) => c.id === selectedUserId)?.name || "Seleccionado"
                  : "Selecciona un chofer"}
              </p>
            </div>
          </div>

          {!selectedUserId ? (
            // Chat List View
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-border">
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

              {/* Chats List */}
              <ScrollArea className="flex-1">
                <div className="space-y-1 p-2">
                  {filteredChats.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {searchQuery ? "Sin resultados" : "Sin conversaciones"}
                    </p>
                  ) : (
                    filteredChats.map((chat: any) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedUserId(chat.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{chat.name}</p>
                          </div>
                          {chat.unreadCount && chat.unreadCount > 0 && (
                            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 ml-2">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Chat View
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      Sin mensajes
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
                          className={`max-w-xs px-2 py-1 rounded text-xs break-words ${
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
              <div className="border-t border-border p-2 flex gap-1">
                <Input
                  placeholder="Mensaje..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={isLoading || !messageText.trim()}
                  className="h-8 w-8 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Back Button */}
              <div className="border-t border-border p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUserId(null);
                    setMessageText("");
                  }}
                  className="w-full text-xs h-8"
                >
                  ← Volver a chats
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
