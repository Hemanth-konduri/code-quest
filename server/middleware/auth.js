import jwt from "jsonwebtoken";
import UserSession from "../models/userSession.js";
import { hashToken } from "../utils/deviceParser.js";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication token required" });
    }
    const token = authHeader.split(" ")[1];
    let decodedata = jwt.verify(token, process.env.JWT_SECRET);
    req.userid = decodedata?.id;
    req.token = token;

    // Check server-side session revocation in UserSession DB
    const tokenHash = hashToken(token);
    const sessionRecord = await UserSession.findOne({ sessionTokenHash: tokenHash });

    if (sessionRecord) {
      if (sessionRecord.status === "revoked") {
        return res.status(401).json({
          message: "Session has been revoked. Please log in again.",
          isRevoked: true,
        });
      }

      if (new Date() > new Date(sessionRecord.expiresAt)) {
        sessionRecord.status = "expired";
        await sessionRecord.save();
        return res.status(401).json({
          message: "Session expired. Please log in again.",
          isExpired: true,
        });
      }

      // Update last activity timestamp
      sessionRecord.lastActivityAt = new Date();
      await sessionRecord.save();
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
        isExpired: true,
      });
    }
    return res.status(401).json({ message: "Invalid authentication token" });
  }
};

export default auth;
