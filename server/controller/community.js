import mongoose from "mongoose";
import Post from "../models/post.js";
import PostLike from "../models/postLike.js";
import Comment from "../models/comment.js";
import Bookmark from "../models/bookmark.js";
import Follow from "../models/follow.js";
import Hashtag from "../models/hashtag.js";
import Notification from "../models/notification.js";
import UserSuspension from "../models/userSuspension.js";
import User from "../models/auth.js";
import { extractHashtags, extractMentions, calculateTrendingScore } from "../utils/tagParser.js";

// Helper: Check if user is suspended
const checkSuspension = async (userid) => {
  const suspension = await UserSuspension.findOne({ userid });
  if (suspension) {
    if (suspension.isPermanent) return true;
    if (suspension.expiresAt && new Date(suspension.expiresAt) > new Date()) return true;
  }
  return false;
};

// 1. CREATE POST
export const createPost = async (req, res) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isSuspended = await checkSuspension(userid);
    if (isSuspended) {
      return res.status(403).json({ message: "Your account is currently suspended from creating posts." });
    }

    const { content, media, codeSnippet, projectLink } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Post content is required." });
    }

    if (content.length > 3000) {
      return res.status(400).json({ message: "Post content exceeds maximum length of 3000 characters." });
    }

    if (media && Array.isArray(media) && media.length > 4) {
      return res.status(400).json({ message: "Maximum 4 images allowed per post." });
    }

    if (codeSnippet && codeSnippet.code && codeSnippet.code.length > 5000) {
      return res.status(400).json({ message: "Code snippet exceeds maximum length of 5000 characters." });
    }

    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);

    const newPost = new Post({
      userid,
      content: content.trim(),
      media: media || [],
      codeSnippet: codeSnippet || {},
      projectLink: projectLink || "",
      hashtags,
      mentions,
      trendingScore: calculateTrendingScore(0, 0, 0, new Date()),
    });

    await newPost.save();

    // Update Hashtags collection
    if (hashtags.length > 0) {
      const hashtagPromises = hashtags.map((tag) =>
        Hashtag.findOneAndUpdate(
          { name: tag },
          { $inc: { postCount: 1 } },
          { upsert: true, new: true }
        )
      );
      await Promise.all(hashtagPromises);
    }

    // Send notifications to mentioned users if valid users exist
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({ name: { $in: mentions } }).select("_id");
      const notificationPromises = mentionedUsers
        .filter((u) => u._id.toString() !== userid.toString())
        .map((u) =>
          Notification.create({
            recipientId: u._id,
            actorId: userid,
            type: "mention",
            postid: newPost._id,
          })
        );
      await Promise.all(notificationPromises);
    }

    const populatedPost = await Post.findById(newPost._id).populate(
      "userid",
      "name email planBadge currentPlan role"
    );

    return res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server error while creating post." });
  }
};

// 2. GET COMMUNITY FEED
export const getFeed = async (req, res) => {
  try {
    const { tab = "for-you", tag, cursor, limit = 20 } = req.query;
    const pageSize = Math.min(parseInt(limit) || 20, 50);
    const currentUserId = req.userid || null;

    let query = { status: "active" };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    if (tab === "following" && currentUserId) {
      const followDocs = await Follow.find({ followerId: currentUserId }).select("followingId");
      const followingIds = followDocs.map((f) => f.followingId);
      query.userid = { $in: followingIds };
    } else if (tab === "hashtag" && tag) {
      query.hashtags = tag.toLowerCase();
    }

    let sort = { createdAt: -1 };
    if (tab === "trending") {
      sort = { trendingScore: -1, createdAt: -1 };
    }

    const posts = await Post.find(query)
      .sort(sort)
      .limit(pageSize + 1)
      .populate("userid", "name email planBadge currentPlan role");

    const hasNextPage = posts.length > pageSize;
    const resultPosts = hasNextPage ? posts.slice(0, pageSize) : posts;

    const nextCursor =
      hasNextPage && resultPosts.length > 0
        ? resultPosts[resultPosts.length - 1].createdAt.toISOString()
        : null;

    // Fetch user-specific interaction states if logged in
    let likedPostIds = new Set();
    let bookmarkedPostIds = new Set();

    if (currentUserId && resultPosts.length > 0) {
      const postIds = resultPosts.map((p) => p._id);
      const [likes, bookmarks] = await Promise.all([
        PostLike.find({ userid: currentUserId, postid: { $in: postIds } }).select("postid"),
        Bookmark.find({ userid: currentUserId, postid: { $in: postIds } }).select("postid"),
      ]);

      likedPostIds = new Set(likes.map((l) => l.postid.toString()));
      bookmarkedPostIds = new Set(bookmarks.map((b) => b.postid.toString()));
    }

    const enrichedPosts = resultPosts.map((post) => {
      const postObj = post.toObject();
      return {
        ...postObj,
        isLiked: likedPostIds.has(post._id.toString()),
        isBookmarked: bookmarkedPostIds.has(post._id.toString()),
      };
    });

    return res.status(200).json({
      posts: enrichedPosts,
      nextCursor,
      hasNextPage,
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return res.status(500).json({ message: "Server error while fetching feed." });
  }
};

// 3. GET SINGLE POST BY ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userid || null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await Post.findOne({ _id: id, status: "active" }).populate(
      "userid",
      "name email planBadge currentPlan role"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    let isLiked = false;
    let isBookmarked = false;

    if (currentUserId) {
      const [like, bookmark] = await Promise.all([
        PostLike.findOne({ userid: currentUserId, postid: id }),
        Bookmark.findOne({ userid: currentUserId, postid: id }),
      ]);
      isLiked = !!like;
      isBookmarked = !!bookmark;
    }

    return res.status(200).json({
      post: {
        ...post.toObject(),
        isLiked,
        isBookmarked,
      },
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Server error while fetching post." });
  }
};

// 4. UPDATE POST (Post Owner Only)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isSuspended = await checkSuspension(userid);
    if (isSuspended) {
      return res.status(403).json({ message: "Your account is suspended." });
    }

    const post = await Post.findById(id);
    if (!post || post.status === "removed") {
      return res.status(404).json({ message: "Post not found." });
    }

    // Strict Server-Side Authorization
    if (post.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "Forbidden: You can only edit your own posts." });
    }

    const { content, media, codeSnippet, projectLink } = req.body;

    if (content !== undefined) {
      if (typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ message: "Post content cannot be empty." });
      }
      if (content.length > 3000) {
        return res.status(400).json({ message: "Post content exceeds maximum 3000 characters." });
      }
      post.content = content.trim();
      post.hashtags = extractHashtags(content);
      post.mentions = extractMentions(content);
    }

    if (media !== undefined) {
      if (Array.isArray(media) && media.length > 4) {
        return res.status(400).json({ message: "Maximum 4 images allowed per post." });
      }
      post.media = media;
    }

    if (codeSnippet !== undefined) {
      post.codeSnippet = codeSnippet;
    }

    if (projectLink !== undefined) {
      post.projectLink = projectLink;
    }

    await post.save();

    const updatedPost = await Post.findById(id).populate(
      "userid",
      "name email planBadge currentPlan role"
    );

    return res.status(200).json({
      message: "Post updated successfully.",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({ message: "Server error while updating post." });
  }
};

// 5. DELETE POST (Post Owner or Admin Only)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const post = await Post.findById(id);
    if (!post || post.status === "removed") {
      return res.status(404).json({ message: "Post not found." });
    }

    const requestingUser = await User.findById(userid).select("role");

    // Strict Server-Side Authorization
    const isOwner = post.userid.toString() === userid.toString();
    const isAdmin = requestingUser && requestingUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: You can only delete your own posts." });
    }

    // Soft delete post to preserve audit trail
    post.status = "removed";
    await post.save();

    // Remove post count for hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      await Promise.all(
        post.hashtags.map((tag) =>
          Hashtag.findOneAndUpdate({ name: tag }, { $inc: { postCount: -1 } })
        )
      );
    }

    return res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server error while deleting post." });
  }
};
