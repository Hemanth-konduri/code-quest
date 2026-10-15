import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  History,
  Share,
  Trash,
  CheckCircle2,
  Lock,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { MembershipBadge } from "./MembershipBadge";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
const questionData = {
  id: 3,
  title: "How can i block user with middleware?",
  content: `
## The problem

I am trying to create a complete user login form in NextJS and I want to block the user to go to other pages without a login process before. So online i found that one of the most complete solution could be the use of a middleware but i don't know how it doesn't work.

## Middleware code:

\`\`\`javascript
// middleware.ts (position: root)
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const token = req.cookies.get("authToken")?.value;
  
  if (!token) {
    console.log("[middleware] No token on", pathname, "-> redirect to /");
    return NextResponse.redirect(new URL("/", req.url));
  }
  
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (err) {
    console.log("[middleware] Invalid token on", pathname, "->", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/add-todo",
    "/add-todo/:path*",
    "/edit-todo",
    "/edit-todo/:path*",
    "/settings",
  ]
}
\`\`\`

What I'm expecting is that when the user tries to access protected routes without being authenticated, they should be redirected to the login page. However, the middleware doesn't seem to be working as expected.

## What I tried:

1. Placed the middleware.ts file in the root directory
2. Configured the matcher to include all protected routes
3. Used JWT verification to check token validity
4. Added proper error handling and logging

The middleware runs but the redirects don't work properly. Sometimes users can still access protected pages even without valid tokens.
  `,
  votes: -4,
  answers: 2,
  views: 38,
  tags: ["node.js", "forms", "authentication", "next.js", "middleware"],
  author: {
    id: 3,
    name: "Aledi5",
    avatar: "A",
  },
  askedDate: "3 days ago",
  modifiedDate: "3 days ago",
  isBookmarked: false,
  userVote: null, // null, 'up', or 'down'
};

// Mock answers data
const answersData = [
  {
    id: 1,
    content: `The issue you're experiencing is likely due to the middleware configuration and how NextJS handles redirects. Here are a few things to check:

## 1. Middleware File Location
Make sure your \`middleware.ts\` file is in the correct location - it should be in the root of your project (same level as \`pages\` or \`app\` directory).

## 2. Import Statements
You're missing some important imports in your middleware:

\`\`\`javascript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
\`\`\`

## 3. Updated Middleware Code

\`\`\`javascript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies
  const token = request.cookies.get("authToken")?.value;
  
  if (!token) {
    console.log("[middleware] No token found, redirecting to login");
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(token, secret);
    console.log("[middleware] Token verified for user:", payload.sub);
    return NextResponse.next();
  } catch (error) {
    console.log("[middleware] Token verification failed:", error);
    // Clear the invalid token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('authToken');
    return response;
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/add-todo/:path*',
    '/edit-todo/:path*',
    '/settings/:path*'
  ]
}
\`\`\`

## Key Changes:
- Added proper imports
- Redirect to \`/login\` instead of \`/\`
- Clear invalid tokens from cookies
- Simplified matcher patterns
- Better error handling

This should resolve your middleware issues.`,
    votes: 5,
    author: {
      id: 1,
      name: "John Doe",
      reputation: 15420,
      avatar: "JD",
    },
    answeredDate: "2 days ago",
    isAccepted: true,
    userVote: null,
  },
  {
    id: 2,
    content: `Another approach you might consider is using NextAuth.js which handles authentication middleware automatically:

## Installation
\`\`\`bash
npm install next-auth
\`\`\`

## Configuration
Create \`pages/api/auth/[...nextauth].js\`:

\`\`\`javascript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Add your authentication logic here
        const user = await authenticateUser(credentials)
        return user ? user : null
      }
    })
  ],
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      return { ...token, ...user }
    },
    async session({ session, token }) {
      return { ...session, user: token }
    }
  }
})
\`\`\`

## Middleware with NextAuth
\`\`\`javascript
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*']
}
\`\`\`

This approach is more robust and handles many edge cases automatically.`,
    votes: 2,
    author: {
      id: 2,
      name: "Felix Rodriguez",
      reputation: 799,
      avatar: "FR",
    },
    answeredDate: "1 day ago",
    isAccepted: false,
    userVote: null,
  },
];

const QuestionDetail = ({ questionId }: any) => {
  const router = useRouter();
  const { user } = useAuth();
  const [question, setquestion] = useState<any>(questionData);
  const [realQuestion, setRealQuestion] = useState<any>(null);
  const [answersList, setAnswersList] = useState<any[]>(answersData);
  const [newanswer, setnewAnswer] = useState("");
  const [isSubmitting, setisSubmitting] = useState(false);

  const fetchQuestionData = async () => {
    if (!questionId) return;
    try {
      const res = await axiosInstance.get("/question/getallquestion");
      const matched = res.data.data.find(
        (q: any) => q._id === questionId || String(q._id) === String(questionId)
      );
      if (matched) {
        setRealQuestion(matched);
        setquestion((prev: any) => ({
          ...prev,
          id: matched._id,
          title: matched.questiontitle || prev.title,
          content: matched.questionbody || prev.content,
          tags: matched.questiontags || prev.tags,
          votes: (matched.upvote?.length || 0) - (matched.downvote?.length || 0),
          isClosed: matched.isClosed,
          closeVotes: matched.closeVotes || [],
          author: {
            id: matched.userid,
            name: matched.userposted || "Community User",
            badge: matched.userBadge || "Free",
          },
        }));
        if (matched.answer && matched.answer.length > 0) {
          setAnswersList(
            matched.answer.map((a: any) => ({
              id: a._id,
              content: a.answerbody,
              votes: (a.upvote?.length || 0) - (a.downvote?.length || 0),
              author: {
                id: a.userid,
                name: a.useranswered || "User",
                avatar: (a.useranswered || "U").charAt(0).toUpperCase(),
              },
              answeredDate: new Date(a.answeredon || Date.now()).toLocaleDateString(),
              isAccepted: a.isAccepted || matched.acceptedAnswerId === a._id,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error fetching question:", err);
    }
  };

  useEffect(() => {
    fetchQuestionData();
  }, [questionId]);

  const handleVote = async (vote: string) => {
    if (!user) {
      toast.info("Please log in to vote on questions");
      return;
    }
    const qId = realQuestion?._id || questionId;
    if (!qId || qId === 3) {
      setquestion((prev: any) => ({
        ...prev,
        votes: vote === "upvote" ? prev.votes + 1 : prev.votes - 1,
      }));
      toast.success(vote === "upvote" ? "Upvoted!" : "Downvoted!");
      return;
    }
    try {
      await axiosInstance.patch(`/question/vote/${qId}`, {
        value: vote,
        userid: user._id,
      });
      toast.success(vote === "upvote" ? "Upvoted question!" : "Downvoted question (-2 pts)!");
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to vote on question");
    }
  };

  const handleVoteClose = async () => {
    if (!user) {
      toast.info("Please log in to vote to close questions");
      return;
    }
    const qId = realQuestion?._id || questionId;
    try {
      const res = await axiosInstance.patch(`/question/close-vote/${qId}`);
      toast.success(res.data.message || "Vote to close recorded");
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to vote to close");
    }
  };

  const handlebookmark = () => {
    setquestion((prev: any) => ({ ...prev, isBookmarked: !prev.isBookmarked }));
  };

  const handleSubmitanswer = async () => {
    if (!newanswer.trim()) return;
    if (!user) {
      toast.info("Please log in to post an answer");
      return;
    }
    if (question?.isClosed) {
      toast.error("This question is closed and cannot receive new answers.");
      return;
    }
    setisSubmitting(true);
    const qId = realQuestion?._id || questionId;
    try {
      await axiosInstance.post(`/answer/postanswer/${qId}`, {
        answerbody: newanswer,
        useranswered: user.name,
        userid: user._id,
      });
      toast.success("Answer published! You earned +5 reputation points.");
      setnewAnswer("");
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to post answer");
    } finally {
      setisSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (ansId: any) => {
    if (!user) return;
    const qId = realQuestion?._id || questionId;
    try {
      const res = await axiosInstance.patch(`/answer/accept/${qId}/${ansId}`);
      toast.success(
        res.data.isAccepted
          ? "Answer accepted! Author awarded +10 reputation points."
          : "Answer unaccepted."
      );
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept answer");
    }
  };

  const handleVoteAnswer = async (ansId: any, value: string) => {
    if (!user) {
      toast.info("Please log in to vote on answers");
      return;
    }
    const qId = realQuestion?._id || questionId;
    try {
      await axiosInstance.patch(`/answer/vote/${qId}/${ansId}`, {
        value,
        userid: user._id,
      });
      toast.success(value === "upvote" ? "Upvoted answer!" : "Downvoted answer (-2 pts)!");
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to vote on answer");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    const qId = realQuestion?._id || questionId;
    try {
      await axiosInstance.delete(`/question/delete/${qId}`);
      toast.success("Question deleted");
      router.push("/questions");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete question");
    }
  };

  const handleDeleteanswer = async (ansId: any) => {
    if (!window.confirm("Are you sure you want to delete this answer? (Deducts 5 reputation points)"))
      return;
    const qId = realQuestion?._id || questionId;
    try {
      await axiosInstance.delete(`/answer/delete/${qId}`, {
        data: { answerid: ansId },
      });
      toast.success("Answer deleted (-5 reputation points)");
      fetchQuestionData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete answer");
    }
  };

  return (
    <div className="max-w-5xl">
      {/* Question Header */}
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold mb-4 text-gray-900">
          {question.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Asked {question.askedDate}</span>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Voting Section */}
            <div className="flex sm:flex-col items-center sm:items-center p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                className={`p-2 ${"text-gray-600 hover:text-orange-500"}`}
                onClick={() => handleVote("upvote")}
              >
                <ChevronUp className="w-6 h-6" />
              </Button>
              <span>{question.votes}</span>
              <Button
                variant="ghost"
                size="sm"
                className={`p-2 ${"text-gray-600 hover:text-orange-500"}`}
                onClick={() => handleVote("downvote")}
              >
                <ChevronDown className="w-6 h-6" />
              </Button>
              <div className="flex sm:flex-col gap-2 sm:gap-4 mt-4 sm:mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-2 ${
                    question?.isBookmarked
                      ? "text-yellow-500"
                      : "text-gray-600 hover:text-yellow-500"
                  }`}
                  onClick={handlebookmark}
                >
                  <Bookmark
                    className="w-5 h-5"
                    fill={question?.isBookmarked ? "currentColor" : "none"}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  <History className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-4 sm:p-6">
              <div className="prose max-w-none mb-6">
                <div
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: question.content
                      .replace(
                        /## (.*)/g,
                        '<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-900">$1</h3>'
                      )
                      .replace(
                        /```(\w+)?\n([\s\S]*?)```/g,
                        '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">$2</code></pre>'
                      )
                      .replace(
                        /`([^`]+)`/g,
                        '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>'
                      )
                      .replace(/\n\n/g, '</p><p class="mb-4">')
                      .replace(/^/, '<p class="mb-4">')
                      .replace(/$/, "</p>")
                      .replace(
                        /\n(\d+\. .*)/g,
                        '<ol class="list-decimal list-inside my-4"><li>$1</li></ol>'
                      ),
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {question.tags.map((tag: any) => (
                  <Link key={tag} href={`/tags/${tag}`}>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Share className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Flag
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVoteClose}
                    className="text-gray-600 hover:text-amber-700"
                    disabled={question.isClosed}
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    {question.isClosed
                      ? "Closed"
                      : `Vote Close (${question.closeVotes?.length || 0}/3)`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">
                    asked {question.askedDate}
                  </span>
                  <Link
                    href={`/users/${question.author.id}`}
                    className="flex items-center gap-2 hover:bg-blue-50 p-2 rounded"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-sm">
                        {question.author.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 hover:text-blue-800 font-medium">
                          {question.author.name}
                        </span>
                        <MembershipBadge badge={question.userBadge || question.author.badge || "Free"} />
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closed Question Banner */}
      {question.isClosed && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <strong className="font-semibold">This question has been closed.</strong> No new answers can be added. Existing answers can still be viewed and voted on.
          </div>
        </div>
      )}

      {/* Answers Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">
          {answersList.length} Answer
          {answersList.length !== 1 ? "s" : ""}
        </h2>
        <div className="space-y-6">
          {answersList.map((ans: any) => {
            const isQuestionAuthor =
              user &&
              user._id &&
              String(user._id) ===
                String(realQuestion?.userid || question.author?.id);

            return (
              <Card
                key={ans.id}
                className={
                  ans.isAccepted ? "border-green-500 shadow-sm bg-green-50/20" : ""
                }
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Voting & Accept Column */}
                    <div className="flex sm:flex-col items-center p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-gray-200 gap-1 min-w-[72px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-gray-600 hover:text-orange-500"
                        onClick={() => handleVoteAnswer(ans.id, "upvote")}
                      >
                        <ChevronUp className="w-6 h-6" />
                      </Button>
                      <span className="font-semibold text-gray-800 text-base">
                        {ans.votes}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-gray-600 hover:text-orange-500"
                        onClick={() => handleVoteAnswer(ans.id, "downvote")}
                      >
                        <ChevronDown className="w-6 h-6" />
                      </Button>

                      {/* Accept Answer Checkmark */}
                      {isQuestionAuthor ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`p-2 mt-2 ${
                            ans.isAccepted
                              ? "text-green-600 hover:text-green-700 bg-green-100"
                              : "text-gray-300 hover:text-green-600"
                          }`}
                          title={
                            ans.isAccepted
                              ? "Accepted answer (+10 pts awarded)"
                              : "Click to mark as accepted answer (+10 pts to author)"
                          }
                          onClick={() => handleAcceptAnswer(ans.id)}
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </Button>
                      ) : ans.isAccepted ? (
                        <div
                          className="mt-2 text-green-600 p-2"
                          title="Accepted by question author"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : null}
                    </div>

                    {/* Answer Content */}
                    <div className="flex-1 p-4 sm:p-6">
                      {ans.isAccepted && (
                        <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accepted Solution (+10 Reputation Awarded)
                        </div>
                      )}
                      <div className="prose max-w-none mb-6">
                        <div
                          className="text-gray-800 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: ans.content
                              .replace(
                                /## (.*)/g,
                                '<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-900">$1</h3>'
                              )
                              .replace(
                                /```(\w+)?\n([\s\S]*?)```/g,
                                '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">$2</code></pre>'
                              )
                              .replace(
                                /`([^`]+)`/g,
                                '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>'
                              )
                              .replace(/\n\n/g, '</p><p class="mb-4">')
                              .replace(/^/, '<p class="mb-4">')
                              .replace(/$/, "</p>")
                              .replace(
                                /\n(\d+\. .*)/g,
                                '<ol class="list-decimal list-inside my-4"><li>$1</li></ol>'
                              ),
                          }}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Share className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Flag className="w-4 h-4 mr-1" />
                            Flag
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteanswer(ans.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">
                            answered {ans.answeredDate}
                          </span>
                          <Link
                            href={`/users/${ans.author.id}`}
                            className="flex items-center gap-2 hover:bg-blue-50 p-2 rounded"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-sm">
                                {ans.author.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-blue-600 hover:text-blue-800 font-medium">
                                {ans.author.name}
                              </div>
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      {/* Your Answer Form */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Your Answer
          </h3>
          {question?.isClosed ? (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>This question is closed to new answers.</span>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Write your answer here... You can use Markdown formatting. Earn +5 reputation points upon posting!"
                value={newanswer}
                onChange={(e) => setnewAnswer(e.target.value)}
                className="min-h-32 mb-4 resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Button
                  onClick={handleSubmitanswer}
                  disabled={!newanswer.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? "Posting..." : "Post Your Answer (+5 pts)"}
                </Button>
                <p className="text-sm text-gray-600">
                  By posting your answer, you agree to the{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    privacy policy
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-blue-600 hover:underline">
                    terms of service
                  </Link>
                  .
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionDetail;
