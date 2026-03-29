import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  updateUserProfile,
  getUserProfile,
  getOrCreateUserPreferences,
  updateUserPreferences,
  getUserPreferences,
} from "./db";

describe("User Profile & Preferences", () => {
  let testUserId = 1;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Create test user if not exists
    const users = await db.query.users.findFirst({
      where: (users: any, { eq }: any) => eq(users.email, "profile-test@example.com"),
    });
    
    if (!users) {
      const result = await db.insert(require("../drizzle/schema").users).values({
        openId: `test-profile-${Date.now()}`,
        name: "Test User",
        email: "profile-test@example.com",
        role: "admin",
        loginMethod: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }).$returningId();
      
      testUserId = result[0].id;
    } else {
      testUserId = users.id;
    }
  });

  it("should update user profile information", async () => {
    const profileData = {
      name: "Updated Name",
      phone: "+1-555-0123",
      address: "123 Main St",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      bio: "Test bio",
    };

    await updateUserProfile(testUserId, profileData);
    const profile = await getUserProfile(testUserId);

    expect(profile?.name).toBe("Updated Name");
    expect(profile?.phone).toBe("+1-555-0123");
    expect(profile?.address).toBe("123 Main St");
    expect(profile?.city).toBe("Springfield");
    expect(profile?.state).toBe("IL");
    expect(profile?.zipCode).toBe("62701");
    expect(profile?.bio).toBe("Test bio");
  });

  it("should create default preferences for new user", async () => {
    const preferences = await getOrCreateUserPreferences(testUserId);

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe(testUserId);
    expect(preferences.emailNotifications).toBe(true);
    expect(preferences.smsNotifications).toBe(true);
    expect(preferences.pushNotifications).toBe(true);
    expect(preferences.theme).toBe("dark");
    expect(preferences.language).toBe("es");
    expect(preferences.timezone).toBe("America/New_York");
  });

  it("should update user preferences", async () => {
    const updates = {
      emailNotifications: false,
      smsNotifications: false,
      theme: "light" as const,
      language: "en",
    };

    await updateUserPreferences(testUserId, updates);
    const preferences = await getUserPreferences(testUserId);

    expect(preferences?.emailNotifications).toBe(false);
    expect(preferences?.smsNotifications).toBe(false);
    expect(preferences?.theme).toBe("light");
    expect(preferences?.language).toBe("en");
  });

  it("should retrieve user preferences", async () => {
    const preferences = await getUserPreferences(testUserId);

    expect(preferences).toBeDefined();
    expect(preferences?.userId).toBe(testUserId);
    expect(preferences?.notifyOnLoadAssignment).toBe(true);
    expect(preferences?.notifyOnPayment).toBe(true);
  });

  it("should handle partial profile updates", async () => {
    const partialUpdate = {
      name: "Partial Update Name",
    };

    await updateUserProfile(testUserId, partialUpdate);
    const profile = await getUserProfile(testUserId);

    expect(profile?.name).toBe("Partial Update Name");
    // Other fields should remain unchanged
    expect(profile?.phone).toBe("+1-555-0123");
    expect(profile?.city).toBe("Springfield");
  });

  it("should handle privacy preferences", async () => {
    const privacyUpdate = {
      showOnlineStatus: false,
      allowLocationTracking: true,
    };

    await updateUserPreferences(testUserId, privacyUpdate);
    const preferences = await getUserPreferences(testUserId);

    expect(preferences?.showOnlineStatus).toBe(false);
    expect(preferences?.allowLocationTracking).toBe(true);
  });

  it("should handle notification type preferences", async () => {
    const notificationUpdate = {
      notifyOnLoadAssignment: false,
      notifyOnMessage: false,
      notifyOnBonus: false,
    };

    await updateUserPreferences(testUserId, notificationUpdate);
    const preferences = await getUserPreferences(testUserId);

    expect(preferences?.notifyOnLoadAssignment).toBe(false);
    expect(preferences?.notifyOnMessage).toBe(false);
    expect(preferences?.notifyOnBonus).toBe(false);
    // Other notification types should remain unchanged
    expect(preferences?.notifyOnPayment).toBe(true);
  });

  it("should retrieve existing preferences without creating duplicates", async () => {
    const prefs1 = await getOrCreateUserPreferences(testUserId);
    const prefs2 = await getOrCreateUserPreferences(testUserId);

    expect(prefs1.id).toBe(prefs2.id);
  });

  afterAll(async () => {
    // Cleanup can be done here if needed
  });
});
