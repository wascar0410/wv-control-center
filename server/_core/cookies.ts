import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.secure || req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const values = Array.isArray(forwardedProto)
    ? forwardedProto
    : String(forwardedProto).split(",");

  return values.some((v) => v.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    // host-only cookie: más segura y evita problemas entre Railway / custom domains
    domain: undefined,
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
