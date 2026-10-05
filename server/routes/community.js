import express from "express";
import auth from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
  sharePost,
  addComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  toggleFollowUser,
  getFollowers,
  getFollowing,
  toggleBookmarkPost,
  getBookmarks,
  getTrendingHashtags,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  reportPost,
  getAdminReports,
  updateReportStatus,
  toggleUserSuspension,
} from "../controller/community.js";

const router = express.Router();

// --- 1. Feed & Post CRUD Routes ---
router.get("/feed", optionalAuth, getFeed);
router.post("/posts", auth, createPost);
router.get("/posts/:id", optionalAuth, getPostById);
router.patch("/posts/:id", auth, updatePost);
router.delete("/posts/:id", auth, deletePost);

// --- 2. Likes & Share Routes ---
router.post("/posts/:id/like", auth, toggleLikePost);
router.post("/posts/:id/share", sharePost);

// --- 3. Comments & Nested Replies Routes ---
router.post("/posts/:id/comments", auth, addComment);
router.get("/posts/:id/comments", getCommentsByPost);
router.patch("/comments/:commentId", auth, updateComment);
router.delete("/comments/:commentId", auth, deleteComment);

// --- 4. Follow System Routes ---
router.post("/users/:targetUserId/follow", auth, toggleFollowUser);
router.get("/users/:userId/followers", getFollowers);
router.get("/users/:userId/following", getFollowing);

// --- 5. Bookmarks Routes ---
router.post("/posts/:id/bookmark", auth, toggleBookmarkPost);
router.get("/bookmarks", auth, getBookmarks);

// --- 6. Hashtags Routes ---
router.get("/hashtags", getTrendingHashtags);

// --- 7. Notifications Routes ---
router.get("/notifications", auth, getNotifications);
router.patch("/notifications/read-all", auth, markAllNotificationsAsRead);
router.patch("/notifications/:id/read", auth, markNotificationAsRead);
router.get("/notifications/unread-count", auth, getUnreadNotificationCount);

// --- 8. Reporting & Admin Moderation Routes ---
router.post("/posts/:id/report", auth, reportPost);
router.get("/admin/reports", auth, getAdminReports);
router.patch("/admin/reports/:reportId", auth, updateReportStatus);
router.post("/admin/users/:targetUserId/suspend", auth, toggleUserSuspension);

export default router;
