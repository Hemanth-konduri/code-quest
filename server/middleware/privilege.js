import mongoose from "mongoose";
import UserReputation from "../models/userReputation.js";
import { PRIVILEGES, getUnlockedPrivileges } from "../utils/reputationRules.js";

/**
 * Middleware factory to enforce reputation privileges on routes
 * @param {string} privilegeKey - e.g. "comment_unrestricted", "edit_posts", "vote_close", "inappropriate_reporting"
 */
export const requirePrivilege = (privilegeKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.userid;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const privilege = PRIVILEGES.find((p) => p.key === privilegeKey);
      if (!privilege) {
        return next();
      }

      let userRep = await UserReputation.findOne({
        userId: new mongoose.Types.ObjectId(String(userId)),
      });

      const currentPoints = userRep?.points || 0;

      if (currentPoints < privilege.points) {
        return res.status(403).json({
          message: `Action requires the '${privilege.name}' privilege (${privilege.points} reputation points required).`,
          privilege: privilege.key,
          requiredPoints: privilege.points,
          currentPoints,
          pointsNeeded: privilege.points - currentPoints,
        });
      }

      req.userReputation = userRep;
      next();
    } catch (error) {
      console.error("Privilege check error:", error);
      res.status(500).json({ message: "Failed to verify privilege permissions" });
    }
  };
};

/**
 * Helper to check privilege without throwing error
 */
export const checkUserPrivilege = async (userId, privilegeKey) => {
  if (!userId) return false;
  const privilege = PRIVILEGES.find((p) => p.key === privilegeKey);
  if (!privilege) return true;

  const userRep = await UserReputation.findOne({
    userId: new mongoose.Types.ObjectId(String(userId)),
  });

  return (userRep?.points || 0) >= privilege.points;
};
