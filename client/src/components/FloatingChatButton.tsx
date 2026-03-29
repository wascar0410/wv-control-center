import React, { useState, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Search, Smile, Download, BarChart3, Clock, Paperclip, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestNotificationPermission, sendChatNotification, playNotificationSound, isNotificationEnabled } from "@/lib/notifications";

const EMOJI_REACTIONS = ["👍", "❌", "⏰", "🚚", "💰", "✅", "⚠️", "🤔"];

export function FloatingChatButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pulseIntervalRef = React.useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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

  // Request notification permission on mount
  React.useEffect(() => {
    if (user?.role === "admin" && !isNotificationEnabled()) {
      requestNotificationPermission();
    }
  }, [user]);

  // Monitor for new messages and send notifications
  React.useEffect(() => {
    if (unreadCount > 0 && !isOpen && user?.role === "admin") {
      const latestChat = recentChats[0];
      if (latestChat) {
        playNotificationSound();
        sendChatNotification(
          latestChat.name,
          latestChat.lastMessage || "Nuevo mensaje",
          () => {
            setIsOpen(true);
            setSelectedUserId(latestChat.id);
          }
        );
      }
    }
  }, [unreadCount, isOpen, recentChats, user]);


  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setSelectedFile(null);
      setShowEmojiPicker(false);
      trpc.useUtils().chat.getMessages.invalidate();
      trpc.useUtils().chat.getRecentChats.invalidate();
    },
  });

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedUserId || !user) return;

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };


  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Pulse animation when new messages
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      setHasNewMessage(true);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    } else {
      setHasNewMessage(false);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    }

    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
  }, [unreadCount, isOpen]);

  // Filter chats
  const filteredChats = recentChats.filter((chat: any) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get total unread
  const totalUnread = recentChats.reduce(
    (sum: number, chat: any) => sum + (chat.unreadCount || 0),
    0
  );

  // Calculate chat statistics
  const chatStats = {
    totalChats: recentChats.length,
    totalMessages: messages.length,
    unreadMessages: totalUnread,
    activeChoferes: recentChats.filter((c: any) => c.isOnline).length,
  };

  // Export chat to CSV
  const handleExportChat = () => {
    if (messages.length === 0) return;

    const csv = [
      ["Fecha", "Remitente", "Mensaje"],
      ...messages.map((msg: any) => [
        new Date(msg.createdAt).toLocaleString("es-ES"),
        msg.senderId === user?.id ? "Yo (Dispatcher)" : "Chofer",
        msg.content,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${selectedUserId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 ${
          hasNewMessage ? "animate-pulse" : ""
        }`}
        aria-label="Abrir chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
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
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">
                {selectedUserId
                  ? recentChats.find((c: any) => c.id === selectedUserId)?.name || "Chat"
                  : "Chat con Choferes"}
              </h3>
              <p className="text-xs opacity-90">
                {selectedUserId
                  ? recentChats.find((c: any) => c.id === selectedUserId)?.isOnline
                    ? "🟢 En línea"
                    : "🔴 Desconectado"
                  : `${totalUnread} mensajes sin leer`}
              </p>
            </div>
          </div>

          {!selectedUserId ? (
            // Chat List View with Tabs
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full rounded-none border-b border-border bg-muted/50">
                <TabsTrigger value="chats" className="flex-1">
                  Chats
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1">
                  Estadísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chats" className="flex-1 flex flex-col overflow-hidden m-0">
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar chofer..."
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
                          className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-muted transition-colors border border-transparent hover:border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    chat.isOnline ? "bg-green-500" : "bg-gray-500"
                                  }`}
                                ></span>
                                <p className="font-medium truncate">{chat.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {chat.lastMessage || "Sin mensajes"}
                              </p>
                            </div>
                            {chat.unreadCount && chat.unreadCount > 0 && (
                              <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 ml-2 font-bold">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stats" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold">Total de Chats</p>
                      </div>
                      <p className="text-2xl font-bold">{chatStats.totalChats}</p>
                    </div>

                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-green-500" />
                        <p className="text-xs font-semibold">Choferes Activos</p>
                      </div>
                      <p className="text-2xl font-bold">{chatStats.activeChoferes}</p>
                    </div>

                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <p className="text-xs font-semibold">Mensajes Sin Leer</p>
                      </div>
                      <p className="text-2xl font-bold">{chatStats.unreadMessages}</p>
                    </div>

                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Send className="h-4 w-4 text-purple-500" />
                        <p className="text-xs font-semibold">Total de Mensajes</p>
                      </div>
                      <p className="text-2xl font-bold">{chatStats.totalMessages}</p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            // Chat View
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      Sin mensajes. ¡Comienza una conversación!
                    </p>
                  ) : (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                        onMouseEnter={() => setSelectedMessageId(msg.id)}
                        onMouseLeave={() => setSelectedMessageId(null)}
                      >
                        <div className="relative group">
                          <div
                            className={`max-w-xs px-3 py-2 rounded-lg text-xs break-words ${
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

                          {/* Emoji reactions on hover */}
                          {selectedMessageId === msg.id && (
                            <div className="absolute -top-8 left-0 right-0 flex gap-1 bg-background border border-border rounded-lg p-1 shadow-lg">
                              {EMOJI_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    // TODO: Implement emoji reaction save
                                    setSelectedMessageId(null);
                                  }}
                                  className="text-lg hover:scale-125 transition-transform cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-border p-2 space-y-2">
                <div className="flex gap-1">
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
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 p-0"
                    title="Adjuntar archivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-8 w-8 p-0"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
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

                {/* Emoji picker */}
                {showEmojiPicker && (
                  <div className="bg-muted rounded-lg p-2 grid grid-cols-8 gap-1">
                    {EMOJI_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessageText(messageText + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg hover:bg-background rounded p-1 transition-colors"
                      >
                                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* File attachment preview */}
                {selectedFile && (
                  <div className="bg-muted rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-primary" />
                      <span className="text-xs truncate">{selectedFile.name}</span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>

              {/* Actions */}
              <div className="border-t border-border p-2 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUserId(null);
                    setMessageText("");
                  }}
                  className="flex-1 text-xs h-8"
                >
                  ← Volver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportChat}
                  className="flex-1 text-xs h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
