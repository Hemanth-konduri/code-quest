import mongoose from "mongoose";
import question from "../models/question.js";
import User from "../models/auth.js";
import { incrementDailyQuestionCount } from "../middleware/checkDailyLimit.js";
import {
  awardQuestionMilestone10Upvotes,
  deductDownvote,
} from "../services/reputationService.js";

export const Askquestion = async (req, res) => {
  const { postquestiondata } = req.body;
  const postques = new question({ ...postquestiondata });
  try {
    await postques.save();
    if (req.userid) {
      await incrementDailyQuestionCount(req.userid);
    }
    res.status(200).json({ data: postques });
  } catch (error) {
    console.log(error);
    res.status(500).json("something went wrong..");
    return;
  }
};

export const getallquestion = async (req, res) => {
  try {
    const allquestion = await question.find().sort({ askedon: -1 }).lean();
    
    // Enrich with user plan badges
    const userIds = [...new Set(allquestion.map((q) => q.userid).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select("planBadge currentPlan");
    const userBadgeMap = {};
    users.forEach((u) => {
      userBadgeMap[u._id.toString()] = {
        badge: u.planBadge || "Free",
        plan: u.currentPlan || "free",
      };
    });

    const enrichedQuestions = allquestion.map((q) => ({
      ...q,
      userBadge: q.userid && userBadgeMap[q.userid] ? userBadgeMap[q.userid].badge : "Free",
      userPlan: q.userid && userBadgeMap[q.userid] ? userBadgeMap[q.userid].plan : "free",
    }));

    res.status(200).json({ data: enrichedQuestions });
  } catch (error) {
    res.status(500).json("something went wrong..");
    return;
  }
};

export const deletequestion = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "question unavailable" });
  }
  try {
    await question.findByIdAndDelete(_id);
    res.status(200).json({ message: "question deleted" });
  } catch (error) {
    res.status(500).json("something went wrong..");
    return;
  }
};

export const votequestion = async (req, res) => {
  const { id: _id } = req.params;
  const { value, userid } = req.body;
  const voterId = req.userid || userid;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "question unavailable" });
  }

  if (!voterId) {
    return res.status(401).json({ message: "Authentication required to vote" });
  }

  try {
    const questionDoc = await question.findById(_id);
    if (!questionDoc) {
      return res.status(404).json({ message: "question not found" });
    }

    // Anti-Abuse: Prevent self-voting on questions
    if (questionDoc.userid && String(questionDoc.userid) === String(voterId)) {
      return res.status(400).json({ message: "You cannot vote on your own question" });
    }

    questionDoc.upvote = questionDoc.upvote || [];
    questionDoc.downvote = questionDoc.downvote || [];

    const upindex = questionDoc.upvote.findIndex((id) => id === String(voterId));
    const downindex = questionDoc.downvote.findIndex((id) => id === String(voterId));

    if (value === "upvote") {
      if (downindex !== -1) {
        questionDoc.downvote = questionDoc.downvote.filter(
          (id) => id !== String(voterId)
        );
      }
      if (upindex === -1) {
        questionDoc.upvote.push(String(voterId));

        // Check 10-upvote milestone bonus (+2 once)
        if (questionDoc.upvote.length >= 10 && !questionDoc.hasAwarded10Upvotes) {
          questionDoc.hasAwarded10Upvotes = true;
          if (questionDoc.userid) {
            await awardQuestionMilestone10Upvotes(questionDoc.userid, _id);
          }
        }
      } else {
        questionDoc.upvote = questionDoc.upvote.filter((id) => id !== String(voterId));
      }
    } else if (value === "downvote") {
      if (upindex !== -1) {
        questionDoc.upvote = questionDoc.upvote.filter((id) => id !== String(voterId));
      }
      if (downindex === -1) {
        questionDoc.downvote.push(String(voterId));
        // Deduct 2 points for downvote
        if (questionDoc.userid) {
          await deductDownvote(questionDoc.userid, _id, "question", voterId);
        }
      } else {
        questionDoc.downvote = questionDoc.downvote.filter(
          (id) => id !== String(voterId)
        );
      }
    }

    await questionDoc.save();
    res.status(200).json({ data: questionDoc });
  } catch (error) {
    console.error("votequestion error:", error);
    res.status(500).json("something went wrong..");
  }
};

export const voteCloseQuestion = async (req, res) => {
  const { id: _id } = req.params;
  const voterId = req.userid;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid question ID" });
  }

  try {
    const questionDoc = await question.findById(_id);
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (questionDoc.isClosed) {
      return res.status(400).json({ message: "Question is already closed" });
    }

    questionDoc.closeVotes = questionDoc.closeVotes || [];
    const index = questionDoc.closeVotes.findIndex((id) => id === String(voterId));

    if (index === -1) {
      questionDoc.closeVotes.push(String(voterId));
    } else {
      questionDoc.closeVotes.splice(index, 1);
    }

    // Close question if threshold reached (3 votes)
    if (questionDoc.closeVotes.length >= 3) {
      questionDoc.isClosed = true;
    }

    await questionDoc.save();
    res.status(200).json({
      data: questionDoc,
      message: questionDoc.isClosed
        ? "Question reached close-vote threshold and has been closed"
        : "Vote to close recorded successfully",
      closeVotesCount: questionDoc.closeVotes.length,
      isClosed: questionDoc.isClosed,
    });
  } catch (error) {
    console.error("voteCloseQuestion error:", error);
    res.status(500).json({ message: "Failed to record vote to close" });
  }
};
