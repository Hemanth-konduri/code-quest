import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "react-toastify";
import { Image, Code, Link2, X, Send, Eye, Edit3 } from "lucide-react";

interface PostComposerProps {
  onPostCreated: () => void;
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [currentMediaInput, setCurrentMediaInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [projectLink, setProjectLink] = useState("");
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || !user) return null;

  const handleAddMedia = () => {
    if (!currentMediaInput.trim()) return;
    if (mediaUrls.length >= 4) {
      toast.error("Maximum 4 images allowed per post.");
      return;
    }
    setMediaUrls([...mediaUrls, currentMediaInput.trim()]);
    setCurrentMediaInput("");
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Post content cannot be empty.");
      return;
    }

    if (content.length > 3000) {
      toast.error("Content exceeds maximum length of 3000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        content: content.trim(),
        media: mediaUrls.map((url) => ({ url, type: "image" })),
        projectLink: projectLink.trim() || undefined,
      };

      if (showCodeInput && codeContent.trim()) {
        payload.codeSnippet = {
          language: codeLanguage,
          code: codeContent.trim(),
        };
      }

      await axiosInstance.post("/community/posts", payload);
      toast.success("Post published to Community!");

      // Reset form
      setContent("");
      setMediaUrls([]);
      setCodeContent("");
      setShowCodeInput(false);
      setProjectLink("");
      setShowProjectInput(false);
      setActiveTab("write");

      onPostCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-800">Create a Post</span>
        </div>

        {/* Write vs Preview Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-3 py-1 rounded-md font-medium flex items-center gap-1 transition ${
              activeTab === "write" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3 py-1 rounded-md font-medium flex items-center gap-1 transition ${
              activeTab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {activeTab === "write" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Main Text Area */}
          <div className="relative">
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What technical knowledge, project, or learning milestone are you sharing today? Use #hashtags and @mentions..."
              className="w-full text-sm p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span
              className={`absolute bottom-2 right-3 text-[11px] font-mono ${
                content.length > 3000 ? "text-red-500 font-bold" : "text-gray-400"
              }`}
            >
              {content.length}/3000
            </span>
          </div>

          {/* Media URLs Section */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded border overflow-hidden group">
                  <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image Input Box */}
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="Image URL (e.g. https://images.unsplash.com/...)"
              value={currentMediaInput}
              onChange={(e) => setCurrentMediaInput(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={handleAddMedia}
              disabled={mediaUrls.length >= 4}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded disabled:opacity-50"
            >
              Add Image
            </button>
          </div>

          {/* Code Snippet Box Expandable */}
          {showCodeInput && (
            <div className="bg-gray-900 text-white rounded-md p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-gray-400">Code Snippet</span>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="javascript">JavaScript / TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML / CSS</option>
                  <option value="cpp">C++ / Java</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
              <textarea
                rows={5}
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                placeholder="// Paste or write your code snippet here..."
                className="w-full font-mono text-xs bg-gray-800 text-green-400 border border-gray-700 rounded p-2 focus:outline-none"
              />
            </div>
          )}

          {/* Project Link Box Expandable */}
          {showProjectInput && (
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-400" />
              <input
                type="url"
                placeholder="Project URL (GitHub / Demo Link)"
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`p-2 rounded hover:bg-gray-100 transition text-xs font-medium flex items-center gap-1 ${
                  showCodeInput ? "text-orange-600 bg-orange-50" : "text-gray-600"
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Code</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProjectInput(!showProjectInput)}
                className={`p-2 rounded hover:bg-gray-100 transition text-xs font-medium flex items-center gap-1 ${
                  showProjectInput ? "text-orange-600 bg-orange-50" : "text-gray-600"
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Project</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </form>
      ) : (
        /* Preview Tab */
        <div className="space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
          <p className="text-gray-900 whitespace-pre-wrap">{content || "No content written yet..."}</p>
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {mediaUrls.map((url, i) => (
                <img key={i} src={url} alt="Preview" className="w-full h-32 object-cover rounded" />
              ))}
            </div>
          )}
          {showCodeInput && codeContent && (
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
              <code>{codeContent}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
