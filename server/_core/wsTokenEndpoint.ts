import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sdk } from "./sdk";

const router = Router();

/**
 * Generate JWT token for WebSocket authentication
 * This endpoint is called by the client to get a token for WebSocket connection
 */
router.get("/api/auth/ws-token", async (req: Request, res: Response) => {
  try {
    // Authenticate user from request (session/cookie)
    let user = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (error) {
      console.error("[WebSocket Token] Authentication failed:", error);
    }
    
    if (!user || !user.id) {
      console.error("[WebSocket Token] No authenticated user found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Generate JWT token for WebSocket
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: "websocket",
      },
      process.env.JWT_SECRET || "your-secret-key",
      {
        expiresIn: "24h", // Token expires in 24 hours
        algorithm: "HS256",
      }
    );

    console.log("[WebSocket Token] Generated token for user:", user.id);
    res.json({ token });
  } catch (error) {
    console.error("[WebSocket Token] Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

export default router;
