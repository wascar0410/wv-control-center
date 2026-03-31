import { useEffect, useState, useCallback } from "react";
import { offlineQueue, type QueuedDelivery } from "@/lib/offlineQueue";

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedDelivery[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(setQueue);
    return unsubscribe;
  }, []);

  // Subscribe to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Queue a delivery
  const queueDelivery = useCallback((loadId: number, notes: string) => {
    return offlineQueue.addDelivery(loadId, notes);
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((id: string) => {
    offlineQueue.removeDelivery(id);
  }, []);

  // Sync queue
  const syncQueue = useCallback(async (onSync?: (delivery: QueuedDelivery, success: boolean) => void) => {
    setIsSyncing(true);
    try {
      await offlineQueue.syncQueue(onSync);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return offlineQueue.getSyncStatus();
  }, []);

  return {
    queue,
    isOnline,
    isSyncing,
    queueDelivery,
    removeFromQueue,
    syncQueue,
    getSyncStatus,
    pendingCount: queue.filter(d => d.status === "pending").length,
  };
}
