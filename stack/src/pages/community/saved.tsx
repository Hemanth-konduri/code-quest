import React, { useState, useEffect } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import PostCard, { PostData } from "@/components/community/PostCard";
import { Bookmark, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function SavedPostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        const res = await axiosInstance.get("/community/bookmarks");
        setPosts(res.data.posts || []);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSavedPosts();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <Mainlayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600 font-black text-lg">
            <Bookmark className="w-5 h-5 fill-orange-600" />
            <h1>Saved Bookmarks</h1>
          </div>
          <span className="text-xs text-gray-400 font-mono">{posts.length} saved</span>
        </div>

        {!user ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-600">
            Please log in to view your saved bookmarks.
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white border rounded-lg p-4 h-36 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center space-y-2">
            <Bookmark className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-bold text-gray-800 text-sm">No bookmarked posts yet</h3>
            <p className="text-xs text-gray-500">
              Bookmark technical posts from the community feed to view them privately here later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </Mainlayout>
  );
}
