import { cn } from "@/lib/utils";
import {
  Bookmark,
  Bot,
  Building,
  FileText,
  Home,
  MessageSquare,
  MessageSquareIcon,
  Tag,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Award,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { Badge } from "./ui/badge";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

const Sidebar = ({ isopen }: any) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div>
      <aside
        className={cn(
          " top-[53px]  w-48 lg:w-64 min-h-screen bg-white shadow-sm border-r transition-transform duration-200 ease-in-out md:translate-x-0",
          isopen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-2 lg:p-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Home className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.home")}
              </Link>
            </li>
            <li>
              <Link
                href="/community"
                className="flex items-center px-2 py-2 text-orange-600 font-bold hover:bg-orange-50 rounded text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2 lg:mr-3 text-orange-600" />
                {t("nav.community")}
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs bg-orange-100 text-orange-800 font-bold"
                >
                  LIVE
                </Badge>
              </Link>
            </li>
            <li>
              <Link
                href="/questions"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <MessageSquareIcon className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.questions")}
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Bot className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.aiAssist")}
                <Badge variant="secondary" className="ml-auto text-xs">
                  Labs
                </Badge>
              </Link>
            </li>
            <li>
              <Link
                href="/tags"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Tag className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.tags")}
              </Link>
            </li>
            <li>
              <Link
                href="/users"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Users className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.users")}
              </Link>
            </li>
            <li>
              <Link
                href="/membership"
                className="flex items-center px-2 py-2 text-orange-600 font-semibold hover:bg-orange-50 rounded text-sm"
              >
                <Trophy className="w-4 h-4 mr-2 lg:mr-3 text-orange-500" />
                {t("nav.plans")}
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs bg-orange-100 text-orange-800"
                >
                  PRO
                </Badge>
              </Link>
            </li>
            <li>
              <Link
                href="/community/saved"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Bookmark className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.saves")}
              </Link>
            </li>
            <li>
              <Link
                href="/users/security"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <ShieldCheck className="w-4 h-4 mr-2 lg:mr-3 text-orange-600" />
                Security & Devices
              </Link>
            </li>
            <li>
              <Link
                href="/users/reputation"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Award className="w-4 h-4 mr-2 lg:mr-3 text-amber-500" />
                Reputation & Rewards
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Trophy className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.challenges")}
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs bg-orange-100 text-orange-800"
                >
                  NEW
                </Badge>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <MessageSquare className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.chat")}
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <FileText className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.articles")}
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm"
              >
                <Building className="w-4 h-4 mr-2 lg:mr-3" />
                {t("nav.companies")}
              </Link>
            </li>

            {user?.role === "admin" && (
              <li className="pt-3 mt-3 border-t border-purple-200">
                <span className="px-2 text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">
                  Admin Controls
                </span>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/admin"
                      className="flex items-center px-2 py-1.5 text-purple-700 hover:bg-purple-50 rounded text-sm font-medium"
                    >
                      <Shield className="w-4 h-4 mr-2 lg:mr-3 text-purple-600" />
                      Subscriptions
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/moderation"
                      className="flex items-center px-2 py-1.5 text-purple-700 hover:bg-purple-50 rounded text-sm font-medium"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2 lg:mr-3 text-purple-600" />
                      Content Moderation
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/security"
                      className="flex items-center px-2 py-1.5 text-purple-700 hover:bg-purple-50 rounded text-sm font-medium"
                    >
                      <ShieldAlert className="w-4 h-4 mr-2 lg:mr-3 text-purple-600" />
                      Security & Devices
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/reputation"
                      className="flex items-center px-2 py-1.5 text-purple-700 hover:bg-purple-50 rounded text-sm font-medium"
                    >
                      <Award className="w-4 h-4 mr-2 lg:mr-3 text-purple-600" />
                      Reputation Ledger
                    </Link>
                  </li>
                </ul>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
