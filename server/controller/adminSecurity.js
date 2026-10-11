import LoginActivity from "../models/loginActivity.js";
import UserSession from "../models/userSession.js";
import SecurityEvent from "../models/securityEvent.js";
import User from "../models/auth.js";

// Helper: Check admin role
const verifyAdmin = async (userid) => {
  if (!userid) return false;
  const userRecord = await User.findById(userid).select("role");
  return userRecord && userRecord.role === "admin";
};

// 1. GET ALL LOGIN ACTIVITY LOGS
export const getAdminLoginActivity = async (req, res) => {
  try {
    const isAdmin = await verifyAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const {
      search,
      loginResult,
      recognitionStatus,
      startDate,
      endDate,
      limit = 30,
      page = 1,
    } = req.query;

    const query = {};

    if (loginResult) {
      query.loginResult = loginResult;
    }

    if (recognitionStatus) {
      query.recognitionStatus = recognitionStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filter by user search if provided
    if (search && search.trim()) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);
      query.userid = { $in: userIds };
    }

    const pageSize = Math.min(parseInt(limit) || 30, 100);
    const skip = (Math.max(1, parseInt(page) || 1) - 1) * pageSize;

    const [activities, totalCount] = await Promise.all([
      LoginActivity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("userid", "name email role planBadge"),
      LoginActivity.countDocuments(query),
    ]);

    return res.status(200).json({
      activities,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: parseInt(page) || 1,
    });
  } catch (error) {
    console.error("Error fetching admin login activity:", error);
    return res.status(500).json({ message: "Server error while fetching login activities." });
  }
};

// 2. GET ACTIVE SESSIONS ACROSS PLATFORM
export const getAdminUserSessions = async (req, res) => {
  try {
    const isAdmin = await verifyAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const sessions = await UserSession.find({
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActivityAt: -1 })
      .limit(50)
      .populate("userid", "name email role planBadge");

    return res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error fetching admin sessions:", error);
    return res.status(500).json({ message: "Server error while fetching sessions." });
  }
};

// 3. ADMIN REVOKE SESSION
export const adminRevokeSession = async (req, res) => {
  try {
    const isAdmin = await verifyAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const { id } = req.params;
    const sessionRecord = await UserSession.findById(id);
    if (!sessionRecord) {
      return res.status(404).json({ message: "Session not found." });
    }

    sessionRecord.status = "revoked";
    sessionRecord.revokedAt = new Date();
    await sessionRecord.save();

    await SecurityEvent.create({
      userid: sessionRecord.userid,
      eventType: "session_revoked",
      details: `Session ${id} remotely revoked by administrator.`,
    });

    return res.status(200).json({ message: "Session revoked successfully by admin." });
  } catch (error) {
    console.error("Error admin revoking session:", error);
    return res.status(500).json({ message: "Server error while revoking session." });
  }
};

// 4. GET SECURITY AUDIT EVENTS
export const getAdminSecurityEvents = async (req, res) => {
  try {
    const isAdmin = await verifyAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const events = await SecurityEvent.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userid", "name email role");

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Error fetching security events:", error);
    return res.status(500).json({ message: "Server error while fetching security events." });
  }
};
