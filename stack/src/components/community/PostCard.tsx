import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "react-toastify";
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreVertical,
  Edit2,
  Trash2,
  Flag,
  ExternalLink,
  Code,
} from "lucide-react";
import { MembershipBadge } from "../MembershipBadge";
import CommentsSection from "./CommentsSection";
import ReportModal from "./ReportModal";
import Link from "next/link";

export interface PostData {
  _id: string;
  userid: {
    _id: string;
    name: string;
    email?: string;
    planBadge?: string;
    currentPlan?: string;
    role?: string;
  };
  content: string;
  media?: { url: string; type?: string }[];
  codeSnippet?: { language?: string; code?: string };
  projectLink?: string;
  hashtags?: string[];
  mentions?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
}

interface PostCardProps {
  post: PostData;
  onPostUpdated?: () => void;
  onPostDeleted?: (postId: string) => void;
}

export default function PostCard({ post, onPostUpdated, onPostDeleted }: PostCardProps) {
  const { user } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isOwner = hasMounted && user && user._id === post.userid._id;
  const isAdmin = hasMounted && user && user.role === "admin";

  // Format hashtags and mentions in post content
  const renderFormattedContent = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith("#")) {
        const tag = word.substring(1).toLowerCase();
        return (
          <Link
            key={i}
            href={`/community?tab=hashtag&tag=${tag}`}
            className="text-orange-600 font-semibold hover:underline"
          >
            {word}
          </Link>
        );
      }
      if (word.startsWith("@")) {
        return (
          <span key={i} className="text-blue-600 font-semibold hover:underline cursor-pointer">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like posts.");
      return;
    }
    const previousState = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousState);
    setLikesCount(previousState ? previousCount - 1 : previousCount + 1);

    try {
      const res = await axiosInstance.post(`/community/posts/${post._id}/like`);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
    } catch (error) {
      setIsLiked(previousState);
      setLikesCount(previousCount);
      toast.error("Failed to update like.");
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please log in to bookmark posts.");
      return;
    }
    const previousState = isBookmarked;
    setIsBookmarked(!previousState);

    try {
      const res = await axiosInstance.post(`/community/posts/${post._id}/bookmark`);
      setIsBookmarked(res.data.bookmarked);
      toast.success(res.data.bookmarked ? "Post saved to Bookmarks." : "Bookmark removed.");
    } catch (error) {
      setIsBookmarked(previousState);
      toast.error("Failed to update bookmark.");
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/community?postId=${post._id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Post link copied to clipboard!");
      const res = await axiosInstance.post(`/community/posts/${post._id}/share`);
      setSharesCount(res.data.sharesCount);
    } catch (error) {
      toast.info(`Share link: ${postUrl}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await axiosInstance.delete(`/community/posts/${post._id}`);
      toast.success("Post deleted.");
      if (onPostDeleted) onPostDeleted(post._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete post.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await axiosInstance.patch(`/community/posts/${post._id}`, {
        content: editContent,
      });
      toast.success("Post updated.");
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update post.");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4 relative transition hover:border-gray-300">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            {post.userid.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900">{post.userid.name}</span>
              <MembershipBadge badge={post.userid.planBadge || post.userid.currentPlan || "Free"} />
            </div>
            <span className="text-xs text-gray-400">
              {hasMounted
                ? new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
        </div>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-7 z-10 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 text-xs">
              {isOwner && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  Edit Post
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleDelete();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Post
                </button>
              )}
              {!isOwner && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <Flag className="w-3.5 h-3.5 text-orange-600" />
                  Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      {isEditing ? (
        <div className="space-y-2 mb-3">
          <textarea
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs bg-orange-600 text-white rounded font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
          {renderFormattedContent(post.content)}
        </div>
      )}

      {/* Code Snippet View */}
      {post.codeSnippet && post.codeSnippet.code && (
        <div className="bg-gray-900 text-gray-100 rounded-md p-3 mb-3 font-mono text-xs overflow-x-auto relative">
          <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2 text-gray-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-orange-500" />
              {post.codeSnippet.language || "code"}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(post.codeSnippet?.code || "");
                toast.success("Code copied!");
              }}
              className="hover:text-white"
            >
              Copy
            </button>
          </div>
          <pre className="text-green-400">
            <code>{post.codeSnippet.code}</code>
          </pre>
        </div>
      )}

      {/* Media Images Gallery */}
      {post.media && post.media.length > 0 && (
        <div
          className={`grid gap-2 mb-3 ${
            post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.media.map((m, idx) => (
            <img
              key={idx}
              src={m.url}
              alt={`Post media ${idx}`}
              className="w-full max-h-80 object-cover rounded-md border border-gray-100"
            />
          ))}
        </div>
      )}

      {/* Project Link Banner */}
      {post.projectLink && (
        <div className="mb-3">
          <a
            href={post.projectLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Showcase Project</span>
          </a>
        </div>
      )}

      {/* Engagement Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 p-1.5 rounded hover:bg-red-50 transition ${
            isLiked ? "text-red-600 font-semibold" : "hover:text-red-600"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-red-600" : ""}`} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 p-1.5 rounded hover:bg-gray-100 hover:text-gray-900 transition"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{commentsCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 p-1.5 rounded hover:bg-gray-100 hover:text-gray-900 transition"
        >
          <Share2 className="w-4 h-4" />
          <span>{sharesCount}</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`p-1.5 rounded hover:bg-orange-50 transition ${
            isBookmarked ? "text-orange-600" : "hover:text-orange-600"
          }`}
          title="Bookmark post"
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-orange-600" : ""}`} />
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <CommentsSection
          postId={post._id}
          onCommentCountChange={(newCount) => setCommentsCount(newCount)}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        postId={post._id}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
