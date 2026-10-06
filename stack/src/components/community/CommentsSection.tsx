import React, { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import { Send, CornerDownRight, Trash2, Edit2, X } from "lucide-react";
import { MembershipBadge } from "../MembershipBadge";

interface CommentItem {
  _id: string;
  userid: {
    _id: string;
    name: string;
    planBadge?: string;
    currentPlan?: string;
  };
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  replies?: CommentItem[];
}

interface CommentsSectionProps {
  postId: string;
  onCommentCountChange?: (newCount: number) => void;
}

export default function CommentsSection({ postId, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchComments = async () => {
    try {
      const res = await axiosInstance.get(`/community/posts/${postId}/comments`);
      setComments(res.data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleAddComment = async (parentCommentId: string | null = null) => {
    const text = parentCommentId ? replyText : newComment;
    if (!text.trim()) return;

    if (!user) {
      toast.error("Please log in to comment.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/community/posts/${postId}/comments`, {
        content: text,
        parentCommentId,
      });

      toast.success("Comment added.");
      if (parentCommentId) {
        setReplyText("");
        setReplyingToId(null);
      } else {
        setNewComment("");
      }

      if (res.data.commentsCount !== undefined && onCommentCountChange) {
        onCommentCountChange(res.data.commentsCount);
      }

      fetchComments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add comment.");
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await axiosInstance.patch(`/community/comments/${commentId}`, {
        content: editText,
      });
      toast.success("Comment updated.");
      setEditingCommentId(null);
      fetchComments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update comment.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await axiosInstance.delete(`/community/comments/${commentId}`);
      toast.success("Comment deleted.");
      fetchComments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete comment.");
    }
  };

  const renderComment = (comment: CommentItem, isReply = false) => {
    const isOwner = user && user._id === comment.userid._id;
    const isEditing = editingCommentId === comment._id;
    const isReplying = replyingToId === comment._id;

    return (
      <div key={comment._id} className={`space-y-2 ${isReply ? "ml-6 pt-2 border-l-2 border-gray-100 pl-3" : "py-3 border-b border-gray-100"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-xs">
              {comment.userid.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-gray-900">{comment.userid.name}</span>
                <MembershipBadge badge={comment.userid.planBadge || comment.userid.currentPlan || "Free"} />
              </div>
              <span className="text-[10px] text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-1 text-gray-400">
              <button
                onClick={() => {
                  setEditingCommentId(comment._id);
                  setEditText(comment.content);
                }}
                className="hover:text-blue-600 p-1"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteComment(comment._id)}
                className="hover:text-red-600 p-1"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="flex gap-2 items-center mt-1">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 text-xs border rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              onClick={() => handleUpdateComment(comment._id)}
              className="px-2 py-1 text-xs bg-orange-600 text-white rounded font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditingCommentId(null)}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-800 leading-relaxed pl-9">{comment.content}</p>
        )}

        {!isReply && user && (
          <div className="pl-9">
            <button
              onClick={() => {
                setReplyingToId(isReplying ? null : comment._id);
                setReplyText("");
              }}
              className="text-[11px] text-orange-600 hover:underline font-medium flex items-center gap-1"
            >
              <CornerDownRight className="w-3 h-3" />
              Reply
            </button>
          </div>
        )}

        {isReplying && (
          <div className="ml-9 flex gap-2 items-center pt-2">
            <input
              type="text"
              placeholder={`Replying to @${comment.userid.name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 text-xs border rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              onClick={() => handleAddComment(comment._id)}
              className="px-3 py-1 text-xs bg-orange-600 text-white rounded font-medium"
            >
              Reply
            </button>
            <button
              onClick={() => setReplyingToId(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Write root comment input */}
      {user ? (
        <div className="flex gap-2 items-center mb-4">
          <input
            type="text"
            placeholder="Write a comment... (use @name to mention)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment(null)}
            className="flex-1 text-xs border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            onClick={() => handleAddComment(null)}
            className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center mb-4">Log in to join the conversation.</p>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-2">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-1">{comments.map((comment) => renderComment(comment))}</div>
      )}
    </div>
  );
}
