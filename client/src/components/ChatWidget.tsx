import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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

interface ActiveContact {
  id?: number; // Legacy support
  contactUserId?: number; // New normalized field
  name: string;
  email?: string;
  role?: string;
  isOnline?: boolean;
  isVirtual?: boolean;
  unreadCount?: number;
}

interface ChatWidgetProps {
  search?: string;
}

export function ChatWidget({ search = "" }: ChatWidgetProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Single source of truth for active contact
  const [activeContact, setActiveContact] = useState<ActiveContact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [lastDebugAction, setLastDebugAction] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveSearchQuery = (search || localSearchQuery).trim().toLowerCase();

  const { data: recentChats, isLoading: isLoadingChats } = trpc.chat.getRecentChats.useQuery(
    { limit: 50 },
    { 
      enabled: !!user, 
      retry: false,
      refetchInterval: 12000, // Poll every 12 seconds for unread updates
    }
  );

  const { data: messages, isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { contactId: activeContact?.contactUserId || activeContact?.id || 0 },
    { enabled: !!(activeContact?.contactUserId || activeContact?.id) && !!user, retry: false }
  );

  const { data: unreadBySender } = trpc.chat.getUnreadBySender.useQuery(undefined, {
    enabled: !!user,
    retry: false,
    refetchInterval: 15000, // Poll every 15 seconds for unread count updates
  });

  // Define safe arrays BEFORE using them in queries
  const safeChats = Array.isArray(recentChats) ? recentChats : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeUnreadBySender = Array.isArray(unreadBySender) ? unreadBySender : [];

  const { data: availableDrivers, isLoading: isLoadingDrivers } = trpc.admin.getDrivers.useQuery(
    { limit: 100, offset: 0 },
    { enabled: !!user && user.role !== "driver" && safeChats.length === 0, retry: false }
  );

  const markAsReadMutation = trpc.chat.markAsRead.useMutation({
    onSuccess: async () => {
      console.log('[Chat] markAsRead success');
      // Refresh unread counts
      await Promise.all([
        utils.chat.getRecentChats.invalidate(),
        utils.chat.getUnreadBySender.invalidate(),
      ]);
    },
    onError: (err) => {
      console.error('[Chat] markAsRead error:', err);
    },
  });


  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: async (data) => {
      console.log('[Chat Mutation] onSuccess:', data);
      setLastDebugAction("send_success");
      // Clear input only after successful send
      setMessageText("");
      // Invalidate to refresh from server
      await Promise.all([
        utils.chat.getMessages.invalidate(),
        utils.chat.getRecentChats.invalidate(),
      ]);
    },
    onError: (err) => {
      console.error('[Chat Mutation] onError:', err);
      setLastDebugAction("send_error");
      // Don't clear input on error - user can retry
    },
  });

  const filteredChats = useMemo(() => {
    return safeChats.filter((chat: ChatUser) =>
      (chat.name || "").toLowerCase().includes(effectiveSearchQuery)
    );
  }, [safeChats, effectiveSearchQuery]);

  const totalUnread = useMemo(() => {
    // Use unreadBySender if available for more accurate count
    if (safeUnreadBySender.length > 0) {
      return safeUnreadBySender.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
    }
    return safeChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  }, [safeChats, safeUnreadBySender]);

  const handleSelectExistingChat = (chat: any) => {
    // Use normalized contactUserId from getRecentChats
    const contactUserId = chat.contactUserId || (chat.senderId === user?.id ? chat.recipientId : chat.senderId);
    console.log('[CHAT_USER_SELECT_MARK_READ] User explicitly selecting chat:', {
      contactUserId,
      name: chat.name,
      unreadCount: chat.unreadCount
    });
    setActiveContact({
      contactUserId,
      id: contactUserId, // Legacy support
      name: chat.name || `Chofer #${contactUserId}`,
      email: chat.email || '',
      role: chat.role || 'driver',
      isOnline: chat.isOnline,
      unreadCount: chat.unreadCount,
    });
    setLastDebugAction("chat_selected");
    
    // Mark messages from this contact as read ONLY on explicit user click
    if (chat.unreadCount && chat.unreadCount > 0) {
      console.log('[CHAT_MARK_AS_READ_V1] Marking as read for contactId:', contactUserId);
      markAsReadMutation.mutate({ contactId: contactUserId });
    }
  };

  const handleSelectDriver = (driver: any) => {
    console.log('[Chat] Selecting driver for new conversation:', driver.id);
    setActiveContact({
      contactUserId: driver.id,
      id: driver.id, // Legacy support
      name: driver.name,
      email: driver.email,
      role: "driver",
      isVirtual: true,
    });
    setLastDebugAction("driver_selected");
  };

  const handleSelectDispatch = () => {
    console.log('[Chat] Driver selecting dispatch/owner');
    // For driver, select owner/admin from recent chats or use context
    // Find WV Dispatch contact from recent chats or fallback to id=1
    const dispatchContact = safeChats.find(c => c.role === 'owner' || c.name?.includes('Dispatch'));
    const ownerId = dispatchContact?.contactUserId || 1;
    console.log('[Chat] Setting activeContact to owner:', { ownerId, currentUserId: user?.id });
    setActiveContact({
      contactUserId: ownerId,
      id: ownerId, // Legacy support
      name: dispatchContact?.name || "WV Dispatch",
      email: dispatchContact?.email || "dispatch@wvtransports.com",
      role: "owner",
      isOnline: dispatchContact?.isOnline ?? true,
      isVirtual: true,
    });
    setLastDebugAction("dispatch_selected");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Chat] handleSendMessage clicked', { activeContact, messageLength: messageText.length });
    setLastDebugAction("send_clicked");

    if (!messageText.trim() || !user || isSending) {
      console.log('[Chat] Early return - validation failed', { messageText: messageText.trim(), user: !!user, isSending });
      return;
    }

    const contactId = activeContact?.contactUserId || activeContact?.id;
    if (!contactId) {
      console.error('[Chat] No active contact selected');
      setLastDebugAction("send_error_no_contact");
      return;
    }

    const recipientId = contactId;
    const messageToSend = messageText.trim();

    console.log('[Chat Widget] Sending message:', {
      toUserId: recipientId,
      fromUserId: user.id,
      messageLength: messageToSend.length,
      activeContactType: activeContact.isVirtual ? 'virtual' : 'existing_chat',
    });

    setIsSending(true);
    try {
      const result = await sendMessageMutation.mutateAsync({
        recipientId,
        message: messageToSend,
      });
      console.log('[Chat Widget] Message sent successfully:', result);
    } catch (error) {
      console.error('[Chat Widget] Failed to send message:', error);
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

  // Auto-select first chat if none selected, or dispatch for drivers
  // NOTE: Auto-select does NOT mark as read - only explicit user clicks do
  useEffect(() => {
    if (!activeContact && safeChats.length > 0) {
      if (user?.role === 'driver') {
        // Driver: auto-select WV Dispatch WITHOUT marking as read
        console.log('[CHAT_AUTO_SELECT_NO_MARK_READ] Driver auto-selecting dispatch');
        const dispatchContact = safeChats.find(c => c.role === 'owner' || c.name?.includes('Dispatch'));
        const ownerId = dispatchContact?.contactUserId || 1;
        setActiveContact({
          contactUserId: ownerId,
          id: ownerId,
          name: dispatchContact?.name || 'WV Dispatch',
          email: dispatchContact?.email || 'dispatch@wvtransports.com',
          role: 'owner',
          isOnline: dispatchContact?.isOnline ?? true,
          isVirtual: true,
        });
        setLastDebugAction('dispatch_auto_selected');
      } else if (filteredChats.length > 0) {
        // Owner/admin: auto-select first chat WITHOUT marking as read
        console.log('[CHAT_AUTO_SELECT_NO_MARK_READ] Owner auto-selecting first chat');
        const firstChat = filteredChats[0];
        const contactUserId = firstChat.contactUserId || (firstChat.senderId === user?.id ? firstChat.recipientId : firstChat.senderId);
        setActiveContact({
          contactUserId,
          id: contactUserId,
          name: firstChat.name || `Chofer #${contactUserId}`,
          email: firstChat.email || '',
          role: firstChat.role || 'driver',
          isOnline: firstChat.isOnline,
          unreadCount: firstChat.unreadCount,
        });
        setLastDebugAction('chat_auto_selected');
      }
    }
  }, [filteredChats, activeContact, user?.role, safeChats.length]);

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
            {isLoadingChats || safeChats.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando conversaciones...
              </div>
            ) : filteredChats.length === 0 && (isLoadingDrivers || !availableDrivers || availableDrivers.length === 0) ? (
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
            ) : filteredChats.length === 0 && availableDrivers && availableDrivers.length > 0 ? (
              <div className="space-y-2">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Iniciar conversación
                </p>
                {availableDrivers.map((driver: any) => {
                  const isSelected = activeContact?.id === driver.id && activeContact?.isVirtual;
                  return (
                    <button
                      key={driver.id}
                      onClick={() => handleSelectDriver(driver)}
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
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {driver.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {driver.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              filteredChats.map((chat) => {
                // Use normalized contactUserId from getRecentChats
                const contactUserId = chat.contactUserId || (chat.senderId === user?.id ? chat.recipientId : chat.senderId);
                const isSelected = (activeContact?.contactUserId === contactUserId || activeContact?.id === contactUserId) && !activeContact?.isVirtual;

                return (
                  <button
                    key={chat.contactUserId ?? contactUserId}
                    onClick={() => handleSelectExistingChat(chat)}
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
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {chat.name || `Chofer #${contactUserId}`}
                          </p>

                          {!!chat.unreadCount && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {chat.isOnline ? 'Conectado' : 'Desconectado'}
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
        {activeContact ? (
          <>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeContact.name || "Chat"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conectado
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
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p
                              className={`text-[11px] ${
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
                            {isOwn && (
                              <p className={`text-[10px] font-medium ${
                                msg.isRead
                                  ? "text-primary-foreground/90"
                                  : "text-primary-foreground/70"
                              }`}>
                                {msg.isRead
                                  ? msg.readAt
                                    ? `Leído ${new Date(msg.readAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}`
                                    : "Leído"
                                  : "Enviado"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  disabled={isSending}
                  aria-label="Escribir mensaje"
                />
                <Button
                  type="submit"
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
              </form>
            </div>

            {/* Diagnostic footer */}
            <div className="border-t border-border/50 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Chat build: 1abe3ab7+</span>
                <span>Contact: {activeContact?.id || "none"}</span>
                <span>Action: {lastDebugAction}</span>
              </div>
            </div>
          </>
        ) : user?.role === "driver" ? (
          // Driver view: show dispatch contact option
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Iniciar conversación</p>
            </div>
            <div className="flex-1 p-5">
              <button
                onClick={handleSelectDispatch}
                className="w-full rounded-xl border border-transparent bg-background px-4 py-4 text-left transition-all hover:border-border hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">WV Dispatch</p>
                    <p className="mt-1 text-xs text-muted-foreground">Owner / Dispatcher</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Diagnostic footer */}
            <div className="border-t border-border/50 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Chat build: 1abe3ab7+</span>
                <span>Contact: {activeContact?.id || "none"}</span>
                <span>Action: {lastDebugAction}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Selecciona un chofer</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige una conversación para ver mensajes y responder.
            </p>

            {/* Diagnostic footer */}
            <div className="mt-8 border-t border-border/50 bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Chat build: 1abe3ab7+</span>
                <span>Contact: {activeContact?.id || "none"}</span>
                <span>Action: {lastDebugAction}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
