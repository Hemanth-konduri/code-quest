import React from "react";
import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import ReputationSection from "@/components/ReputationSection";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function UserReputationPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Mainlayout>
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800">Please log in</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            You need to be logged in to view your reputation dashboard and activity ledger.
          </p>
          <Link
            href="/auth"
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold hover:bg-orange-700"
          >
            Log In
          </Link>
        </div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/users/${user._id}`}
                className="text-xs text-gray-500 hover:text-orange-600 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
              </Link>
            </div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-orange-600" />
              Reputation & Community Rewards
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Track your contribution milestones, unlocked community privileges, and peer transfers.
            </p>
          </div>
        </div>

        {/* Reputation Component */}
        <ReputationSection
          userId={user._id}
          isOwnProfile={true}
          userName={user.name}
        />
      </div>
    </Mainlayout>
  );
}
