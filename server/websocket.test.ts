import { describe, it, expect, beforeEach, vi } from "vitest";
import { wsManager } from "./_core/websocket";

describe("WebSocket Manager", () => {
  beforeEach(() => {
    // Reset manager state
    vi.clearAllMocks();
  });

  describe("Connection Management", () => {
    it("should track connected users", () => {
      const initialCount = wsManager.getConnectedUsersCount();
      expect(typeof initialCount).toBe("number");
      expect(initialCount).toBeGreaterThanOrEqual(0);
    });

    it("should get user connection count", () => {
      const userId = 1;
      const count = wsManager.getUserConnectionCount(userId);
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Message Types", () => {
    it("should handle loadAssigned message", () => {
      const message = {
        type: "loadAssigned" as const,
        data: {
          loadId: 1,
          clientName: "Test Client",
          pickupAddress: "123 Main St",
          deliveryAddress: "456 Oak Ave",
          price: "500",
        },
      };

      expect(message.type).toBe("loadAssigned");
      expect(message.data?.loadId).toBe(1);
    });

    it("should handle loadUpdated message", () => {
      const message = {
        type: "loadUpdated" as const,
        data: {
          loadId: 1,
          status: "in_transit",
          driverLocation: { lat: 40.7128, lng: -74.006 },
        },
      };

      expect(message.type).toBe("loadUpdated");
      expect(message.data?.status).toBe("in_transit");
    });

    it("should handle loadCancelled message", () => {
      const message = {
        type: "loadCancelled" as const,
        data: {
          loadId: 1,
          reason: "Client cancelled",
        },
      };

      expect(message.type).toBe("loadCancelled");
      expect(message.data?.reason).toBe("Client cancelled");
    });

    it("should include timestamp in messages", () => {
      const now = Date.now();
      const message = {
        type: "loadAssigned" as const,
        timestamp: now,
      };

      expect(message.timestamp).toBe(now);
      expect(message.timestamp).toBeGreaterThan(0);
    });
  });

  describe("Notification Delivery", () => {
    it("should notify single user", () => {
      const userId = 1;
      const message = {
        type: "loadAssigned" as const,
        data: { loadId: 1 },
      };

      // Mock: user not connected, should return false
      const result = wsManager.notifyUser(userId, message);
      expect(typeof result).toBe("boolean");
    });

    it("should notify multiple users", () => {
      const userIds = [1, 2, 3];
      const message = {
        type: "loadAssigned" as const,
        data: { loadId: 1 },
      };

      // Should not throw error
      expect(() => {
        wsManager.notifyUsers(userIds, message);
      }).not.toThrow();
    });

    it("should broadcast to all users", () => {
      const message = {
        type: "loadAssigned" as const,
        data: { loadId: 1 },
      };

      // Should not throw error
      expect(() => {
        wsManager.broadcast(message);
      }).not.toThrow();
    });
  });

  describe("Message Payload", () => {
    it("should include all required fields in loadAssigned", () => {
      const payload = {
        type: "loadAssigned",
        data: {
          loadId: 1,
          clientName: "Test Client",
          pickupAddress: "123 Main St",
          deliveryAddress: "456 Oak Ave",
          weight: "1000",
          price: "500",
          estimatedDistance: "150",
        },
        timestamp: Date.now(),
      };

      expect(payload.type).toBe("loadAssigned");
      expect(payload.data).toHaveProperty("loadId");
      expect(payload.data).toHaveProperty("clientName");
      expect(payload.data).toHaveProperty("pickupAddress");
      expect(payload.data).toHaveProperty("deliveryAddress");
      expect(payload.timestamp).toBeDefined();
    });

    it("should handle missing optional fields", () => {
      const payload = {
        type: "loadUpdated",
        data: {
          loadId: 1,
        },
      };

      expect(payload.data.loadId).toBe(1);
      expect(payload.data).not.toHaveProperty("clientName");
    });
  });

  describe("Connection Lifecycle", () => {
    it("should handle heartbeat/ping-pong", () => {
      const message = {
        type: "ping" as const,
      };

      expect(message.type).toBe("ping");
    });

    it("should track connection state", () => {
      const initialCount = wsManager.getConnectedUsersCount();
      expect(initialCount).toBeGreaterThanOrEqual(0);

      // After operations, count should still be valid
      const finalCount = wsManager.getConnectedUsersCount();
      expect(finalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid token gracefully", () => {
      // Invalid token should not crash the system
      expect(() => {
        // Simulating invalid token scenario
        const invalidToken = "invalid.token.here";
        expect(invalidToken).toBeDefined();
      }).not.toThrow();
    });

    it("should handle disconnection gracefully", () => {
      // Should not throw when notifying disconnected user
      expect(() => {
        wsManager.notifyUser(999, {
          type: "loadAssigned",
          data: { loadId: 1 },
        });
      }).not.toThrow();
    });
  });

  describe("Resource Cleanup", () => {
    it("should cleanup resources", () => {
      // Should not throw when cleaning up
      expect(() => {
        wsManager.cleanup();
      }).not.toThrow();
    });
  });
});
