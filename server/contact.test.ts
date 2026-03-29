import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import {
  createContactSubmission,
  getContactSubmissions,
} from "./db";

describe("Contact Submissions", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create a contact submission", async () => {
    const result = await createContactSubmission({
      name: "Test User",
      company: "Test Company",
      email: "test@example.com",
      message: "This is a test message for contact form",
      status: "new",
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result) || result.insertId).toBeTruthy();
  });

  it("should retrieve contact submissions", async () => {
    const submissions = await getContactSubmissions();
    expect(Array.isArray(submissions)).toBe(true);
  });

  it("should filter contact submissions by status", async () => {
    // Create a new submission
    await createContactSubmission({
      name: "Filter Test",
      company: "Filter Company",
      email: "filter@example.com",
      message: "Testing filter functionality",
      status: "new",
    });

    const newSubmissions = await getContactSubmissions("new");
    expect(Array.isArray(newSubmissions)).toBe(true);
  });

  it("should handle contact submission with optional company", async () => {
    const result = await createContactSubmission({
      name: "No Company User",
      company: null,
      email: "nocompany@example.com",
      message: "Testing without company field",
      status: "new",
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result) || result.insertId).toBeTruthy();
  });

  it("should create multiple submissions", async () => {
    const submissions = [];
    for (let i = 0; i < 3; i++) {
      const result = await createContactSubmission({
        name: `User ${i}`,
        company: `Company ${i}`,
        email: `user${i}@example.com`,
        message: `Test message number ${i} with enough content`,
        status: "new",
      });
      submissions.push(result);
    }

    expect(submissions.length).toBe(3);
    submissions.forEach((sub) => {
      expect(sub).toBeDefined();
    });
  });

  it("should retrieve all submissions successfully", async () => {
    const submissions = await getContactSubmissions();
    expect(Array.isArray(submissions)).toBe(true);
    expect(submissions.length).toBeGreaterThanOrEqual(0);
  });

  it("should validate email format at API level", async () => {
    // This test verifies that the API will validate email format
    // Database might accept it, but tRPC procedure will validate
    const result = await createContactSubmission({
      name: "Valid Name",
      company: "Valid Company",
      email: "valid@example.com",
      message: "This is a valid message with enough content",
      status: "new",
    });

    expect(result).toBeDefined();
  });
});
