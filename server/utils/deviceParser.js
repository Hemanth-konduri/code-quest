import crypto from "crypto";

export const parseUserAgent = (userAgent = "") => {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let deviceType = "Desktop";

  const ua = userAgent.toLowerCase();

  // OS Detection
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("android")) {
    os = "Android";
    deviceType = "Mobile";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
    deviceType = ua.includes("ipad") ? "Tablet" : "Mobile";
  } else if (ua.includes("linux")) os = "Linux";

  // Browser Detection
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("opera") || ua.includes("opr/")) browser = "Opera";

  return { browser, os, deviceType, deviceName: `${os} ${deviceType} — ${browser}` };
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
