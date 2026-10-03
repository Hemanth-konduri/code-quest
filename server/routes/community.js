import express from "express";
import auth from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
} from "../controller/community.js";

const router = express.Router();

// Feed & Post CRUD routes
router.get("/feed", optionalAuth, getFeed);
router.post("/posts", auth, createPost);
router.get("/posts/:id", optionalAuth, getPostById);
router.patch("/posts/:id", auth, updatePost);
router.delete("/posts/:id", auth, deletePost);

export default router;
