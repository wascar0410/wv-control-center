import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Search, Circle, MessageSquare, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ChatUser {
  id: number;
  name: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface ChatWidgetProps {
  search?: string;
}

export function ChatWidget({ search = "" }: ChatWidgetProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveSearchQuery = (search || localSearchQuery).trim().toLowerCase();

  const { data: recentChats, isLoading: isLoadingChats } = trpc.chat.getRecentChats.useQuery(
    { limit: 50 },
    { enabled: !!user, retry: false }
  );

  const { data: messages, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { contactId: selectedUserId || 0 },
    { enabled: !!selectedUserId && !!user, retry: false }
  );

  const safeChats = Array.isArray(recentChats) ? recentChats : [];
  const safeMessages = Array.isArray(messages) ? messages : [];

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: async () => {
      setMessageText("");
      await Promise.all([
        utils.chat.getMessages.invalidate(),
        utils.chat.getRecentChats.invalidate(),
      ]);
    },
    onError: (err) => {
      console.error("Chat send error:", err);
    },
  });

  const filteredChats = useMemo(() => {
    return safeChats.filter((chat: ChatUser) =>
      (chat.name || "").toLowerCase().includes(effectiveSearchQuery)
    );
  }, [safeChats, effectiveSearchQuery]);

  const selectedChat = useMemo(() => {
    return safeChats.find((c) => c.id === selectedUserId) || null;
  }, [safeChats, selectedUserId]);

  const totalUnread = useMemo(() => {
    return safeChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  }, [safeChats]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        recipientId: selectedUserId,
        message: messageText.trim(),
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [safeMessages]);

  useEffect(() => {
    if (!selectedUserId && filteredChats.length > 0) {
      setSelectedUserId(filteredChats[0].id);
    }
  }, [filteredChats, selectedUserId]);

  return (
    <div className="flex h-[560px] overflow-hidden rounded-xl border border-border bg-card">
      <aside className="flex w-[300px] flex-col border-r border-border bg-muted/20">
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Choferes
              </p>
              <p className="text-sm font-semibold text-foreground">
                Conversaciones activas
              </p>
            </div>

            {totalUnread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                {totalUnread}
              </span>
            )}
          </div>

          {!search && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar chofer..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Buscar chofer"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {isLoadingChats ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando conversaciones...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">
                  {effectiveSearchQuery ? "Sin resultados" : "Sin conversaciones"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {effectiveSearchQuery
                    ? "Prueba con otro nombre o término."
                    : "Las conversaciones aparecerán aquí."}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedUserId === chat.id;

                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedUserId(chat.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/10 shadow-sm"
                        : "border-transparent bg-background hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative mt-0.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <UserRound className="h-4 w-4 text-primary" />
                        </div>
                        <Circle
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-current ${
                            chat.isOnline ? "text-emerald-500" : "text-slate-400"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {chat.name}
                          </p>

                          {!!chat.unreadCount && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {chat.isOnline ? "En línea" : "Desconectado"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedUserId && selectedChat ? (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <Circle
                    className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 fill-current ${
                      selectedChat.isOnline ? "text-emerald-500" : "text-slate-400"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedChat.name || "Chat"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.isOnline ? "Chofer en línea" : "Chofer desconectado"}
                  </p>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando mensajes...
                </div>
              ) : safeMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    Sin mensajes todavía
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Inicia la conversación con este chofer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeMessages.map((msg: any) => {
                    const isOwn = msg.senderId === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-muted text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.message || msg.content || ""}
                          </p>
                          <p
                            className={`mt-2 text-[11px] ${
                              isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                  aria-label="Escribir mensaje"
                />
                <Button
                  onClick={() => void handleSendMessage()}
                  disabled={!messageText.trim() || isSending}
                  size="icon"
                  aria-label="Enviar mensaje"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Selecciona un chofer</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige una conversación para ver mensajes y responder.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
