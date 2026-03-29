import React, { useState, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Search, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sendChatNotification, playNotificationSound } from "@/lib/notifications";

const EMOJI_REACTIONS = ["👍", "❌", "⏰", "🚚", "💰", "✅", "⚠️", "🤔"];

export function DriverChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Get dispatcher (admin) user - assuming there's only one admin
  const { data: dispatcherChats = [] } = trpc.chat.getRecentChats.useQuery(
    { limit: 1 },
    { enabled: !!user && user.role === "driver" && isOpen }
  );

  // Get messages with dispatcher
  const dispatcherId = dispatcherChats[0]?.id;
  const { data: messages = [] } = trpc.chat.getMessages.useQuery(
    { contactId: dispatcherId || 0 },
    { enabled: !!dispatcherId && !!user && user.role === "driver" && isOpen }
  );

  // Get unread count
  const { data: unreadCount = 0 } = trpc.chat.getUnreadCount.useQuery(
    undefined,
    { enabled: !!user && user.role === "driver" }
  );

  // Send message mutation
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setShowEmojiPicker(false);
      trpc.useUtils().chat.getMessages.invalidate();
      trpc.useUtils().chat.getRecentChats.invalidate();
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !dispatcherId || !user) return;

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        recipientId: dispatcherId,
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

  // Monitor for new messages and send notifications
  React.useEffect(() => {
    if (unreadCount > 0 && !isOpen && user?.role === "driver") {
      playNotificationSound();
      sendChatNotification(
        "Dispatcher",
        "Tienes un nuevo mensaje",
        () => {
          setIsOpen(true);
        }
      );
    }
  }, [unreadCount, isOpen, user]);

  if (!user || user.role !== "driver") return null;

  const dispatcherName = dispatcherChats[0]?.name || "Dispatcher";
  const isDispatcherOnline = dispatcherChats[0]?.isOnline ?? false;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 ${
          unreadCount > 0 && !isOpen ? "animate-pulse" : ""
        }`}
        aria-label="Abrir chat con dispatcher"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
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
              <h3 className="font-semibold text-sm">Chat con {dispatcherName}</h3>
              <p className="text-xs opacity-90">
                {isDispatcherOnline ? "🟢 En línea" : "🔴 Desconectado"}
              </p>
            </div>
          </div>

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
          </div>

          {/* Close Button */}
          <div className="border-t border-border p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full text-xs h-8"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
