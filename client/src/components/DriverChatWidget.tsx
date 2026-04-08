import React, { useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Smile, UserRound, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sendChatNotification, playNotificationSound } from "@/lib/notifications";

const EMOJI_REACTIONS = ["👍", "❌", "⏰", "🚚", "💰", "✅", "⚠️", "🤔"];
const EMOJI_PICKER = ["😀", "👍", "🚚", "✅", "💰", "📍", "⏰", "⚠️", "🤔", "🙏", "📦", "💬"];

export function DriverChatWidget() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const lastUnreadRef = useRef(0);

  const isDriver = user?.role === "driver";

  const { data: dispatcherChatsRaw, isLoading: isLoadingChats } = trpc.chat.getRecentChats.useQuery(
    { limit: 20 },
    {
      enabled: !!user && isDriver && isOpen,
      retry: false,
    }
  );

  const safeDispatcherChats = Array.isArray(dispatcherChatsRaw) ? dispatcherChatsRaw : [];

  const dispatcherChat = useMemo(() => {
    if (!safeDispatcherChats.length) return null;

    return (
      safeDispatcherChats.find((chat: any) => chat.role === "admin" || chat.role === "owner") ||
      safeDispatcherChats[0]
    );
  }, [safeDispatcherChats]);

  const dispatcherId = dispatcherChat?.id ?? null;

  const { data: messagesRaw, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { contactId: dispatcherId || 0 },
    {
      enabled: !!dispatcherId && !!user && isDriver && isOpen,
      retry: false,
    }
  );

  const safeMessages = Array.isArray(messagesRaw) ? messagesRaw : [];

  const { data: unreadCountRaw } = trpc.chat.getUnreadCount.useQuery(undefined, {
    enabled: !!user && isDriver,
    retry: false,
    refetchInterval: 15000,
  });

  const unreadCount = typeof unreadCountRaw === "number" ? unreadCountRaw : 0;

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: async () => {
      setMessageText("");
      setShowEmojiPicker(false);
      await Promise.all([
        utils.chat.getMessages.invalidate(),
        utils.chat.getRecentChats.invalidate(),
        utils.chat.getUnreadCount.invalidate(),
      ]);
    },
    onError: (err) => {
      console.error("Chat send error:", err);
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !dispatcherId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        recipientId: dispatcherId,
        message: messageText.trim(),
      });
    } finally {
      setIsSending(false);
    }
  };

  React.useEffect(() => {
    const el = messagesViewportRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [safeMessages, isOpen]);

  React.useEffect(() => {
    if (!isDriver) return;

    const hadUnreadBefore = lastUnreadRef.current;
    const hasNewUnread = unreadCount > hadUnreadBefore;

    if (hasNewUnread && !isOpen) {
      playNotificationSound();
      sendChatNotification("Dispatcher", "Tienes un nuevo mensaje", () => {
        setIsOpen(true);
      });
    }

    lastUnreadRef.current = unreadCount;
  }, [unreadCount, isOpen, isDriver]);

  if (!user || !isDriver) return null;

  const dispatcherName = dispatcherChat?.name || "Dispatcher";
  const isDispatcherOnline = dispatcherChat?.isOnline ?? false;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl ${
          unreadCount > 0 && !isOpen ? "animate-pulse" : ""
        }`}
        aria-label="Abrir chat con dispatcher"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[560px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/85 px-4 py-4 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <Circle
                    className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 fill-current ${
                      isDispatcherOnline ? "text-emerald-400" : "text-slate-300"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    Chat con {dispatcherName}
                  </h3>
                  <p className="text-xs opacity-90">
                    {isDispatcherOnline ? "En línea" : "Desconectado"}
                  </p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Cerrar chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-background">
            <ScrollArea className="h-full">
              <div ref={messagesViewportRef} className="space-y-3 p-4">
                {isLoadingChats || isLoadingMessages ? (
                  <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando conversación...
                  </div>
                ) : !dispatcherId ? (
                  <div className="flex h-[360px] flex-col items-center justify-center text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      Chat no disponible
                    </p>
                    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                      Aún no se encontró un dispatcher disponible para esta conversación.
                    </p>
                  </div>
                ) : safeMessages.length === 0 ? (
                  <div className="flex h-[360px] flex-col items-center justify-center text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      Sin mensajes todavía
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Empieza la conversación con tu dispatcher.
                    </p>
                  </div>
                ) : (
                  safeMessages.map((msg: any) => {
                    const isOwn = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        onMouseEnter={() => setSelectedMessageId(msg.id)}
                        onMouseLeave={() => setSelectedMessageId(null)}
                      >
                        <div className="relative max-w-[78%]">
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-muted text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content || ""}
                            </p>
                            <p
                              className={`mt-2 text-[11px] ${
                                isOwn ? "text-primary-foreground/75" : "text-muted-foreground"
                              }`}
                            >
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </div>

                          {/* Reactions bar on hover */}
                          {selectedMessageId === msg.id && (
                            <div className="absolute -top-9 left-0 z-10 flex gap-1 rounded-xl border border-border bg-background p-1 shadow-lg">
                              {EMOJI_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    // TODO: guardar reacción real cuando exista endpoint
                                    setSelectedMessageId(null);
                                  }}
                                  className="rounded-md px-1 py-0.5 text-base transition-transform hover:scale-125"
                                  type="button"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Escribe un mensaje..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                disabled={isSending || !dispatcherId}
                className="h-10"
              />

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="h-10 w-10"
                type="button"
                aria-label="Abrir emojis"
              >
                <Smile className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                onClick={() => void handleSendMessage()}
                disabled={isSending || !messageText.trim() || !dispatcherId}
                className="h-10 w-10"
                aria-label="Enviar mensaje"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showEmojiPicker && (
              <div className="mt-3 grid grid-cols-6 gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-8">
                {EMOJI_PICKER.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setMessageText((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="rounded-lg p-1 text-lg transition-colors hover:bg-background"
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
