import mongoose from "mongoose";
import Post from "../models/post.js";
import PostLike from "../models/postLike.js";
import Comment from "../models/comment.js";
import Bookmark from "../models/bookmark.js";
import Follow from "../models/follow.js";
import Hashtag from "../models/hashtag.js";
import Notification from "../models/notification.js";
import UserSuspension from "../models/userSuspension.js";
import Report from "../models/report.js";
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

// 4. UPDATE POST
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

// 5. DELETE POST
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
    const isOwner = post.userid.toString() === userid.toString();
    const isAdmin = requestingUser && requestingUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: You can only delete your own posts." });
    }

    post.status = "removed";
    await post.save();

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

// -------------------------------------------------------------
// DAY 2: SOCIAL INTERACTION CONTROLLERS
// -------------------------------------------------------------

// 6. TOGGLE LIKE POST
export const toggleLikePost = async (req, res) => {
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

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const existingLike = await PostLike.findOne({ userid, postid: id });

    if (existingLike) {
      // Unlike post
      await PostLike.findByIdAndDelete(existingLike._id);
      post.likesCount = Math.max(0, post.likesCount - 1);
      post.trendingScore = calculateTrendingScore(
        post.likesCount,
        post.commentsCount,
        post.sharesCount,
        post.createdAt
      );
      await post.save();

      return res.status(200).json({
        liked: false,
        likesCount: post.likesCount,
      });
    } else {
      // Like post
      await PostLike.create({ userid, postid: id });
      post.likesCount += 1;
      post.trendingScore = calculateTrendingScore(
        post.likesCount,
        post.commentsCount,
        post.sharesCount,
        post.createdAt
      );
      await post.save();

      // Send notification to post owner if not self-like
      if (post.userid.toString() !== userid.toString()) {
        await Notification.create({
          recipientId: post.userid,
          actorId: userid,
          type: "like",
          postid: id,
        });
      }

      return res.status(200).json({
        liked: true,
        likesCount: post.likesCount,
      });
    }
  } catch (error) {
    console.error("Error toggling post like:", error);
    return res.status(500).json({ message: "Server error while processing like." });
  }
};

// 7. SHARE POST TRACKER
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.sharesCount += 1;
    post.trendingScore = calculateTrendingScore(
      post.likesCount,
      post.commentsCount,
      post.sharesCount,
      post.createdAt
    );
    await post.save();

    return res.status(200).json({ sharesCount: post.sharesCount });
  } catch (error) {
    console.error("Error sharing post:", error);
    return res.status(500).json({ message: "Server error while recording share." });
  }
};

// 8. ADD COMMENT OR REPLY
export const addComment = async (req, res) => {
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

    const { content, parentCommentId } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: "Comment exceeds maximum 1000 characters." });
    }

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(400).json({ message: "Parent comment not found." });
      }
    }

    const mentions = extractMentions(content);

    const newComment = new Comment({
      postid: id,
      userid,
      parentCommentId: parentCommentId || null,
      content: content.trim(),
      mentions,
    });

    await newComment.save();

    // Increment comments count & recalculate trending score
    post.commentsCount += 1;
    post.trendingScore = calculateTrendingScore(
      post.likesCount,
      post.commentsCount,
      post.sharesCount,
      post.createdAt
    );
    await post.save();

    // Send notifications
    if (parentComment) {
      // Reply notification
      if (parentComment.userid.toString() !== userid.toString()) {
        await Notification.create({
          recipientId: parentComment.userid,
          actorId: userid,
          type: "reply",
          postid: id,
          commentid: newComment._id,
        });
      }
    } else {
      // Comment notification to post owner
      if (post.userid.toString() !== userid.toString()) {
        await Notification.create({
          recipientId: post.userid,
          actorId: userid,
          type: "comment",
          postid: id,
          commentid: newComment._id,
        });
      }
    }

    // Mention notifications
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({ name: { $in: mentions } }).select("_id");
      const notificationPromises = mentionedUsers
        .filter((u) => u._id.toString() !== userid.toString())
        .map((u) =>
          Notification.create({
            recipientId: u._id,
            actorId: userid,
            type: "mention",
            postid: id,
            commentid: newComment._id,
          })
        );
      await Promise.all(notificationPromises);
    }

    const populatedComment = await Comment.findById(newComment._id).populate(
      "userid",
      "name email planBadge currentPlan role"
    );

    return res.status(201).json({
      message: "Comment added successfully.",
      comment: populatedComment,
      commentsCount: post.commentsCount,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Server error while adding comment." });
  }
};

// 9. GET COMMENTS FOR POST (NESTED STRUCTURE)
export const getCommentsByPost = async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await Comment.find({ postid: id })
      .sort({ createdAt: 1 })
      .populate("userid", "name email planBadge currentPlan role");

    // Structure into nested hierarchy
    const commentMap = {};
    const rootComments = [];

    comments.forEach((c) => {
      const commentObj = c.toObject();
      commentObj.replies = [];
      commentMap[commentObj._id.toString()] = commentObj;
    });

    comments.forEach((c) => {
      const commentObj = commentMap[c._id.toString()];
      if (c.parentCommentId && commentMap[c.parentCommentId.toString()]) {
        commentMap[c.parentCommentId.toString()].replies.push(commentObj);
      } else {
        rootComments.push(commentObj);
      }
    });

    return res.status(200).json({ comments: rootComments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Server error while fetching comments." });
  }
};

// 10. EDIT COMMENT
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userid = req.userid;
    const { content } = req.body;

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (comment.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "Forbidden: You can only edit your own comment." });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content cannot be empty." });
    }

    comment.content = content.trim();
    comment.mentions = extractMentions(content);
    await comment.save();

    const updatedComment = await Comment.findById(commentId).populate(
      "userid",
      "name email planBadge currentPlan role"
    );

    return res.status(200).json({
      message: "Comment updated successfully.",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({ message: "Server error while updating comment." });
  }
};

// 11. DELETE COMMENT
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userid = req.userid;

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const requestingUser = await User.findById(userid).select("role");
    const isOwner = comment.userid.toString() === userid.toString();
    const isAdmin = requestingUser && requestingUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: You can only delete your own comment." });
    }

    // Delete comment and sub-replies
    const replies = await Comment.find({ parentCommentId: commentId }).select("_id");
    const replyIds = replies.map((r) => r._id);
    const allToDeleteIds = [comment._id, ...replyIds];

    await Comment.deleteMany({ _id: { $in: allToDeleteIds } });

    // Decrement post comments count
    const post = await Post.findById(comment.postid);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - allToDeleteIds.length);
      post.trendingScore = calculateTrendingScore(
        post.likesCount,
        post.commentsCount,
        post.sharesCount,
        post.createdAt
      );
      await post.save();
    }

    return res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Server error while deleting comment." });
  }
};

// 12. TOGGLE FOLLOW USER
export const toggleFollowUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const followerId = req.userid;

    if (!followerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (followerId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    const existingFollow = await Follow.findOne({ followerId, followingId: targetUserId });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);
      return res.status(200).json({ following: false, message: "Unfollowed user." });
    } else {
      await Follow.create({ followerId, followingId: targetUserId });

      // Trigger notification
      await Notification.create({
        recipientId: targetUserId,
        actorId: followerId,
        type: "follow",
      });

      return res.status(200).json({ following: true, message: "Followed user." });
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return res.status(500).json({ message: "Server error while processing follow." });
  }
};

// 13. GET FOLLOWERS
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const follows = await Follow.find({ followingId: userId }).populate(
      "followerId",
      "name email planBadge currentPlan role"
    );
    return res.status(200).json({ followers: follows.map((f) => f.followerId) });
  } catch (error) {
    console.error("Error fetching followers:", error);
    return res.status(500).json({ message: "Server error while fetching followers." });
  }
};

// 14. GET FOLLOWING
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const follows = await Follow.find({ followerId: userId }).populate(
      "followingId",
      "name email planBadge currentPlan role"
    );
    return res.status(200).json({ following: follows.map((f) => f.followingId) });
  } catch (error) {
    console.error("Error fetching following:", error);
    return res.status(500).json({ message: "Server error while fetching following." });
  }
};

// 15. TOGGLE BOOKMARK POST
export const toggleBookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const existingBookmark = await Bookmark.findOne({ userid, postid: id });

    if (existingBookmark) {
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      return res.status(200).json({ bookmarked: false, message: "Bookmark removed." });
    } else {
      await Bookmark.create({ userid, postid: id });
      return res.status(200).json({ bookmarked: true, message: "Post bookmarked." });
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return res.status(500).json({ message: "Server error while processing bookmark." });
  }
};

// 16. GET BOOKMARKED POSTS
export const getBookmarks = async (req, res) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookmarks = await Bookmark.find({ userid })
      .sort({ createdAt: -1 })
      .populate({
        path: "postid",
        populate: { path: "userid", select: "name email planBadge currentPlan role" },
      });

    const validPosts = bookmarks
      .filter((b) => b.postid && b.postid.status === "active")
      .map((b) => {
        const postObj = b.postid.toObject();
        return {
          ...postObj,
          isLiked: false,
          isBookmarked: true,
        };
      });

    return res.status(200).json({ posts: validPosts });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({ message: "Server error while fetching bookmarks." });
  }
};

// 17. GET TRENDING HASHTAGS
export const getTrendingHashtags = async (req, res) => {
  try {
    const hashtags = await Hashtag.find({ postCount: { $gt: 0 } })
      .sort({ postCount: -1 })
      .limit(20);
    return res.status(200).json({ hashtags });
  } catch (error) {
    console.error("Error fetching hashtags:", error);
    return res.status(500).json({ message: "Server error while fetching hashtags." });
  }
};

// 18. GET NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find({ recipientId: userid })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actorId", "name email planBadge role")
      .populate("postid", "content media");

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Server error while fetching notifications." });
  }
};

// 19. MARK NOTIFICATION AS READ
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userid = req.userid;

    await Notification.findOneAndUpdate(
      { _id: id, recipientId: userid },
      { read: true }
    );

    return res.status(200).json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return res.status(500).json({ message: "Server error while marking notification as read." });
  }
};

// 20. MARK ALL NOTIFICATIONS AS READ
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Notification.updateMany({ recipientId: userid, read: false }, { read: true });
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    return res.status(500).json({ message: "Server error while marking all notifications read." });
  }
};

// 21. GET UNREAD NOTIFICATION COUNT
export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await Notification.countDocuments({ recipientId: userid, read: false });
    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({ message: "Server error while getting unread notification count." });
  }
};

// 22. REPORT POST
export const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const reporterId = req.userid;
    const { reason, details } = req.body;

    if (!reporterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Report reason is required." });
    }

    const post = await Post.findOne({ _id: id, status: "active" });
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const existingReport = await Report.findOne({
      reporterId,
      postid: id,
      status: "pending",
    });

    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this post." });
    }

    const newReport = new Report({
      reporterId,
      postid: id,
      reason,
      details: details || "",
    });

    await newReport.save();

    return res.status(201).json({ message: "Report submitted successfully. Thank you for keeping our community safe." });
  } catch (error) {
    console.error("Error submitting report:", error);
    return res.status(500).json({ message: "Server error while submitting report." });
  }
};

// 23. ADMIN: GET ALL REPORTS
export const getAdminReports = async (req, res) => {
  try {
    const userid = req.userid;
    const adminUser = await User.findById(userid).select("role");

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const { status = "pending" } = req.query;

    const reports = await Report.find({ status })
      .sort({ createdAt: -1 })
      .populate("reporterId", "name email role")
      .populate("resolvedBy", "name email")
      .populate({
        path: "postid",
        populate: { path: "userid", select: "name email planBadge role" },
      });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    return res.status(500).json({ message: "Server error while fetching reports." });
  }
};

// 24. ADMIN: UPDATE REPORT STATUS & TAKE ACTION
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userid = req.userid;
    const adminUser = await User.findById(userid).select("role");

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const { status, actionTaken } = req.body; // status: "resolved" or "rejected", actionTaken: "remove_post", "none", etc.

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    report.status = status || "resolved";
    report.actionTaken = actionTaken || "none";
    report.resolvedBy = userid;
    await report.save();

    if (actionTaken === "remove_post" && report.postid) {
      await Post.findByIdAndUpdate(report.postid, { status: "removed" });
    }

    return res.status(200).json({ message: "Report updated successfully.", report });
  } catch (error) {
    console.error("Error updating report:", error);
    return res.status(500).json({ message: "Server error while updating report." });
  }
};

// 25. ADMIN: SUSPEND / UNSUSPEND USER
export const toggleUserSuspension = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userid = req.userid;
    const adminUser = await User.findById(userid).select("role");

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    const { reason, isPermanent, expiresAt, action } = req.body; // action: "suspend" or "unsuspend"

    if (action === "unsuspend") {
      await UserSuspension.findOneAndDelete({ userid: targetUserId });
      return res.status(200).json({ suspended: false, message: "User unsuspended successfully." });
    } else {
      if (!reason) {
        return res.status(400).json({ message: "Suspension reason is required." });
      }

      await UserSuspension.findOneAndUpdate(
        { userid: targetUserId },
        {
          userid: targetUserId,
          reason,
          suspendedBy: userid,
          isPermanent: !!isPermanent,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({ suspended: true, message: "User suspended successfully." });
    }
  } catch (error) {
    console.error("Error processing user suspension:", error);
    return res.status(500).json({ message: "Server error while updating user suspension." });
  }
};
