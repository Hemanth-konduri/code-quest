import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { Bell, CheckCheck, Heart, MessageSquare, AtSign, UserPlus, X } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  _id: string;
  actorId: { _id: string; name: string; planBadge?: string };
  type: "like" | "comment" | "reply" | "mention" | "follow";
  postid?: { _id: string; content: string };
  read: boolean;
  createdAt: string;
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onReadCountChange: (count: number) => void;
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  onReadCountChange,
}: NotificationsDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get("/community/notifications");
      const list: NotificationItem[] = res.data.notifications || [];
      setNotifications(list);

      const unread = list.filter((n) => !n.read).length;
      onReadCountChange(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.patch("/community/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onReadCountChange(0);
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  if (!isOpen) return null;

  const renderIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case "comment":
      case "reply":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-orange-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderText = (item: NotificationItem) => {
    switch (item.type) {
      case "like":
        return "liked your post.";
      case "comment":
        return "commented on your post.";
      case "reply":
        return "replied to your comment.";
      case "mention":
        return "mentioned you in a post/comment.";
      case "follow":
        return "started following you.";
      default:
        return "interacted with your content.";
    }
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-2xl p-4 text-gray-800">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-600" />
          <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-orange-600 hover:underline font-medium flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-xs text-gray-400 py-6">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-6">No notifications yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`p-2.5 rounded-md text-xs border transition ${
                item.read ? "bg-white border-gray-100" : "bg-orange-50/60 border-orange-100 font-medium"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">{renderIcon(item.type)}</div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-gray-800">
                    <span className="font-bold">{item.actorId?.name}</span> {renderText(item)}
                  </p>
                  {item.postid && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                      "{item.postid.content}"
                    </p>
                  )}
                  <span className="text-[10px] text-gray-400 block">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
