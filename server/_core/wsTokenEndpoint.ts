import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * Generate JWT token for WebSocket authentication
 * This endpoint is called by the client to get a token for WebSocket connection
 */
router.get("/api/auth/ws-token", (req: Request, res: Response) => {
  try {
    // Check if user is authenticated via session/cookie
    const user = (req as any).user;
    
    if (!user || !user.id) {
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

    res.json({ token });
  } catch (error) {
    console.error("[WebSocket Token] Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

export default router;
