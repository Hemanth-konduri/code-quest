import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { TrendingUp, Hash } from "lucide-react";
import Link from "next/link";

interface HashtagItem {
  _id: string;
  name: string;
  postCount: number;
}

export default function TrendingSidebar() {
  const [hashtags, setHashtags] = useState<HashtagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const res = await axiosInstance.get("/community/hashtags");
        setHashtags(res.data.hashtags || []);
      } catch (error) {
        console.error("Error fetching hashtags:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrendingHashtags();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-3 text-orange-600 font-bold text-sm">
        <TrendingUp className="w-4 h-4" />
        <span>Trending Hashtags</span>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : hashtags.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No trending hashtags yet.</p>
      ) : (
        <div className="space-y-2">
          {hashtags.map((tag) => (
            <Link
              key={tag._id}
              href={`/community?tab=hashtag&tag=${tag.name}`}
              className="flex items-center justify-between p-1.5 rounded hover:bg-orange-50 transition group text-xs"
            >
              <span className="font-semibold text-gray-700 group-hover:text-orange-600 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600" />
                {tag.name}
              </span>
              <span className="text-[11px] text-gray-400 bg-gray-100 group-hover:bg-orange-100 px-2 py-0.5 rounded-full font-mono">
                {tag.postCount} posts
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
