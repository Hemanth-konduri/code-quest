import React, { useState, useEffect, useCallback } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import PostComposer from "@/components/community/PostComposer";
import PostCard, { PostData } from "@/components/community/PostCard";
import TrendingSidebar from "@/components/community/TrendingSidebar";
import { Sparkles, Users, Flame, Hash, Search, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/router";
import { useLanguage } from "@/lib/LanguageContext";

export default function CommunityFeedPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { tab: queryTab, tag: queryTag } = router.query;

  const [activeTab, setActiveTab] = useState<"for-you" | "following" | "trending" | "hashtag">("for-you");
  const [activeTag, setActiveTag] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<PostData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryTab === "hashtag" && queryTag) {
      setActiveTab("hashtag");
      setActiveTag(String(queryTag));
    } else if (queryTab && ["for-you", "following", "trending"].includes(String(queryTab))) {
      setActiveTab(String(queryTab) as any);
    }
  }, [queryTab, queryTag]);

  const fetchPosts = useCallback(
    async (cursor: string | null = null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const params: any = {
          tab: activeTab,
          limit: 15,
        };

        if (activeTab === "hashtag" && activeTag) {
          params.tag = activeTag;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const res = await axiosInstance.get("/community/feed", { params });

        let fetchedPosts: PostData[] = res.data.posts || [];

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          fetchedPosts = fetchedPosts.filter(
            (p) =>
              p.content.toLowerCase().includes(q) ||
              p.hashtags?.some((h) => h.toLowerCase().includes(q)) ||
              p.userid.name.toLowerCase().includes(q)
          );
        }

        if (append) {
          setPosts((prev) => [...prev, ...fetchedPosts]);
        } else {
          setPosts(fetchedPosts);
        }

        setNextCursor(res.data.nextCursor);
        setHasNextPage(res.data.hasNextPage);
      } catch (err: any) {
        console.error("Error fetching feed:", err);
        setError(t("common.error"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, activeTag, searchQuery, t]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-8">
          {/* Header & Category Tabs */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">{t("community.title")}</h1>
                <p className="text-xs text-gray-500">{t("community.subtitle")}</p>
              </div>

              {/* Feed Search Input */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                onClick={() => {
                  setActiveTab("for-you");
                  router.push("/community?tab=for-you", undefined, { shallow: true });
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === "for-you"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("community.forYou")}
              </button>

              <button
                onClick={() => {
                  setActiveTab("following");
                  router.push("/community?tab=following", undefined, { shallow: true });
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === "following"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {t("community.following")}
              </button>

              <button
                onClick={() => {
                  setActiveTab("trending");
                  router.push("/community?tab=trending", undefined, { shallow: true });
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === "trending"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                {t("community.trending")}
              </button>

              {activeTab === "hashtag" && (
                <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md text-xs font-bold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  #{activeTag}
                </span>
              )}
            </div>
          </div>

          {/* Post Composer */}
          <PostComposer onPostCreated={() => fetchPosts()} />

          {/* Feed Content List */}
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full" />
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-28" />
                      <div className="h-2 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-32 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => fetchPosts()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            /* Empty Feed State */
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                🌟
              </div>
              <h3 className="text-base font-bold text-gray-900">{t("community.emptyFeed")}</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {t("community.emptySub")}
              </p>
            </div>
          ) : (
            /* Active Posts List */
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onPostUpdated={() => fetchPosts()}
                  onPostDeleted={handlePostDeleted}
                />
              ))}

              {/* Pagination Load More Button */}
              {hasNextPage && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchPosts(nextCursor, true)}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-xs rounded-full shadow-sm transition disabled:opacity-50"
                  >
                    {loadingMore ? t("common.loading") : t("community.loadMore")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar Widgets Column */}
        <div className="lg:col-span-4 space-y-6">
          <TrendingSidebar />
        </div>
      </div>
    </Mainlayout>
  );
}
