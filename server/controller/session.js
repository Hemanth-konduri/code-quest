import UserSession from "../models/userSession.js";
import TrustedDevice from "../models/trustedDevice.js";
import SecurityEvent from "../models/securityEvent.js";
import { hashToken } from "../utils/deviceParser.js";

// 1. Get user's active sessions
export const getUserSessions = async (req, res) => {
  try {
    const userid = req.userid;
    const currentTokenHash = hashToken(req.token || "");

    const sessions = await UserSession.find({
      userid,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivityAt: -1 });

    const formattedSessions = sessions.map((s) => {
      const isCurrent = s.sessionTokenHash === currentTokenHash;
      return {
        _id: s._id,
        deviceName: s.deviceName,
        browser: s.browser,
        os: s.os,
        deviceType: s.deviceType,
        ip: s.ip,
        location: s.location,
        loginDate: s.createdAt,
        lastActive: s.lastActivityAt,
        status: isCurrent ? "Current device" : "Active session",
        isCurrent,
      };
    });

    return res.status(200).json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return res.status(500).json({ message: "Server error while fetching active sessions." });
  }
};

// 2. Revoke single session
export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    const sessionRecord = await UserSession.findById(id);
    if (!sessionRecord) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (sessionRecord.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "Forbidden: You can only manage your own sessions." });
    }

    sessionRecord.status = "revoked";
    sessionRecord.revokedAt = new Date();
    await sessionRecord.save();

    await SecurityEvent.create({
      userid,
      eventType: "session_revoked",
      details: `Revoked session ${id} (${sessionRecord.deviceName})`,
    });

    const currentTokenHash = hashToken(req.token || "");
    const isCurrentRevoked = sessionRecord.sessionTokenHash === currentTokenHash;

    return res.status(200).json({
      message: "Device session revoked successfully.",
      isCurrentRevoked,
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    return res.status(500).json({ message: "Server error while revoking session." });
  }
};

// 3. Revoke all other sessions
export const revokeAllOtherSessions = async (req, res) => {
  try {
    const userid = req.userid;
    const currentTokenHash = hashToken(req.token || "");

    await UserSession.updateMany(
      {
        userid,
        sessionTokenHash: { $ne: currentTokenHash },
        status: "active",
      },
      {
        $set: { status: "revoked", revokedAt: new Date() },
      }
    );

    await SecurityEvent.create({
      userid,
      eventType: "all_sessions_revoked",
      details: "Signed out from all other devices.",
    });

    return res.status(200).json({ message: "Successfully signed out from all other devices." });
  } catch (error) {
    console.error("Error revoking all other sessions:", error);
    return res.status(500).json({ message: "Server error while signing out other devices." });
  }
};

// 4. Get list of trusted devices
export const getTrustedDevices = async (req, res) => {
  try {
    const userid = req.userid;
    const devices = await TrustedDevice.find({
      userid,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1 });

    return res.status(200).json({ trustedDevices: devices });
  } catch (error) {
    console.error("Error fetching trusted devices:", error);
    return res.status(500).json({ message: "Server error while fetching trusted devices." });
  }
};

// 5. Remove a trusted device
export const removeTrustedDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    const deviceRecord = await TrustedDevice.findById(id);
    if (!deviceRecord) {
      return res.status(404).json({ message: "Trusted device not found." });
    }

    if (deviceRecord.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "Forbidden." });
    }

    deviceRecord.revokedAt = new Date();
    await deviceRecord.save();

    await SecurityEvent.create({
      userid,
      eventType: "trusted_device_removed",
      details: `Removed trusted device ${deviceRecord.deviceLabel}`,
    });

    return res.status(200).json({ message: "Trusted device removed successfully." });
  } catch (error) {
    console.error("Error removing trusted device:", error);
    return res.status(500).json({ message: "Server error while removing trusted device." });
  }
};
