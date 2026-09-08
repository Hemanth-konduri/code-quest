import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  History,
  Share,
  Trash,
} from "lucide-react";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
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

const QuestionDetail = ({ questionId }: any) => {
  const router = useRouter();
  const [question, setquestion] = useState<any>(questionData);

  const handleVote = (vote: String) => {
    // API integration will be added in later steps
    toast.info("Voting will work after backend integration");
  };
  const handlebookmark = () => {
    setquestion((prev: any) => ({ ...prev, isBookmarked: !prev.isBookmarked }));
  };
  const handleDelete = () => {
    // API integration will be added in later steps
    if (!window.confirm("Are you sure you want to delete this question?"))
      return;
    toast.info("Delete will work after backend integration");
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
                      <div className="text-blue-600 hover:text-blue-800 font-medium">
                        {question.author.name}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionDetail;
