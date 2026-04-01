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
    {
