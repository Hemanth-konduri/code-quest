export const REPUTATION_RULES = {
  ANSWER_POSTED: {
    key: "ANSWER_POSTED",
    points: 5,
    description: "Published a valid answer",
  },
  ANSWER_ACCEPTED: {
    key: "ANSWER_ACCEPTED",
    points: 10,
    description: "Answer accepted by question author",
  },
  ANSWER_5_UPVOTES: {
    key: "ANSWER_5_UPVOTES",
    points: 5,
    description: "Answer reached 5 upvotes milestone",
  },
  QUESTION_10_UPVOTES: {
    key: "QUESTION_10_UPVOTES",
    points: 2,
    description: "Question reached 10 upvotes milestone",
  },
  PROFILE_COMPLETED: {
    key: "PROFILE_COMPLETED",
    points: 10,
    description: "Completed profile mandatory fields bonus",
  },
  DOWNVOTE_RECEIVED: {
    key: "DOWNVOTE_RECEIVED",
    points: -2,
    description: "Received a downvote",
  },
  ANSWER_DELETED: {
    key: "ANSWER_DELETED",
    points: -5,
    description: "Deleted own answer",
  },
  ADMIN_CONTENT_REMOVAL: {
    key: "ADMIN_CONTENT_REMOVAL",
    points: -10,
    description: "Content removed by admin for confirmed violation",
  },
};

export const PRIVILEGES = [
  {
    key: "comment_unrestricted",
    points: 50,
    name: "Comment Without Restriction",
    description: "Comment without reputation-based restrictions",
  },
  {
    key: "edit_posts",
    points: 100,
    name: "Edit Community Posts",
    description: "Edit eligible community posts",
  },
  {
    key: "vote_close",
    points: 250,
    name: "Vote to Close Questions",
    description: "Vote to close questions",
  },
  {
    key: "inappropriate_reporting",
    points: 500,
    name: "Enhanced Moderation Reporting",
    description: "Access designated inappropriate-content reporting privilege",
  },
];

export const TRANSFER_LIMITS = {
  MIN_SENDER_BALANCE: 50, // Must have MORE than 50 points (> 50)
  MIN_TRANSFER: 1,
  MAX_PER_TRANSACTION: 50,
  MAX_DAILY_ROLLING: 100, // 100 points in 24 hours
};

export const getUnlockedPrivileges = (points = 0) => {
  return PRIVILEGES.filter((p) => points >= p.points).map((p) => p.key);
};

export const getNextPrivilege = (points = 0) => {
  const next = PRIVILEGES.find((p) => points < p.points);
  if (!next) return null;
  return {
    ...next,
    pointsNeeded: next.points - points,
  };
};

export const getReputationBadge = (points = 0) => {
  if (points >= 1000) return { name: "Platinum", color: "#e5e4e2", icon: "💎" };
  if (points >= 500) return { name: "Gold", color: "#ffd700", icon: "🥇" };
  if (points >= 100) return { name: "Silver", color: "#c0c0c0", icon: "🥈" };
  return { name: "Bronze", color: "#cd7f32", icon: "🥉" };
};
