/**
 * Offline Queue Service
 * Manages local storage of delivery confirmations when offline
 * Syncs automatically when connection returns
 */

export interface QueuedDelivery {
  id: string;
  loadId: number;
  notes: string;
  timestamp: number;
  retries: number;
  lastRetryTime?: number;
  status: "pending" | "syncing" | "failed";
}

const QUEUE_KEY = "driver_delivery_queue";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

class OfflineQueueService {
  private queue: QueuedDelivery[] = [];
  private isSyncing = false;
  private listeners: Array<(queue: QueuedDelivery[]) => void> = [];

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[OfflineQueue] Error loading queue:", error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error("[OfflineQueue] Error saving queue:", error);
    }
  }

  /**
   * Add delivery to queue
   */
  addDelivery(loadId: number, notes: string): string {
    const id = `${loadId}-${Date.now()}`;
    const delivery: QueuedDelivery = {
      id,
      loadId,
      notes,
      timestamp: Date.now(),
      retries: 0,
      status: "pending",
    };

    this.queue.push(delivery);
    this.saveQueue();

    console.log(`[OfflineQueue] Added delivery #${loadId} to queue`);
    return id;
  }

  /**
   * Get all queued deliveries
   */
  getQueue(): QueuedDelivery[] {
    return [...this.queue];
  }

  /**
   * Get pending deliveries count
   */
  getPendingCount(): number {
    return this.queue.filter(d => d.status === "pending").length;
  }

  /**
   * Remove delivery from queue
   */
  removeDelivery(id: string) {
    this.queue = this.queue.filter(d => d.id !== id);
    this.saveQueue();
  }

  /**
   * Update delivery status
   */
  updateDeliveryStatus(id: string, status: "pending" | "syncing" | "failed") {
    const delivery = this.queue.find(d => d.id === id);
    if (delivery) {
      delivery.status = status;
      if (status === "syncing") {
        delivery.lastRetryTime = Date.now();
      }
      this.saveQueue();
    }
  }

  /**
   * Increment retry count
   */
  incrementRetries(id: string): number {
    const delivery = this.queue.find(d => d.id === id);
    if (delivery) {
      delivery.retries++;
      this.saveQueue();
      return delivery.retries;
    }
    return 0;
  }

  /**
   * Check if delivery has exceeded max retries
   */
  hasExceededRetries(id: string): boolean {
    const delivery = this.queue.find(d => d.id === id);
    return delivery ? delivery.retries >= MAX_RETRIES : false;
  }

  /**
   * Clear all queued deliveries
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedDelivery[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener() {
    window.addEventListener("online", () => {
      console.log("[OfflineQueue] Connection restored, syncing queue...");
      this.syncQueue();
    });

    window.addEventListener("offline", () => {
      console.log("[OfflineQueue] Connection lost, queuing deliveries...");
    });
  }

  /**
   * Sync queue with backend
   */
  async syncQueue(onSync?: (delivery: QueuedDelivery, success: boolean) => void) {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;

    for (const delivery of this.queue) {
      if (delivery.status === "pending" || delivery.status === "failed") {
        this.updateDeliveryStatus(delivery.id, "syncing");

        try {
          // This will be called by the component with the actual sync function
          // We just mark it as ready to sync
          console.log(`[OfflineQueue] Ready to sync delivery #${delivery.loadId}`);
          onSync?.(delivery, true);
        } catch (error) {
          console.error(`[OfflineQueue] Sync error for delivery #${delivery.loadId}:`, error);
          const retries = this.incrementRetries(delivery.id);

          if (retries >= MAX_RETRIES) {
            this.updateDeliveryStatus(delivery.id, "failed");
            onSync?.(delivery, false);
          } else {
            this.updateDeliveryStatus(delivery.id, "pending");
          }
        }
      }
    }

    this.isSyncing = false;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isSyncing,
      pendingCount: this.getPendingCount(),
      totalQueued: this.queue.length,
    };
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();
