import mongoose from "mongoose";
import question from "../models/question.js";
import {
  awardAnswerPosted,
  awardAnswerAccepted,
  reverseAnswerAccepted,
  awardAnswerMilestone5Upvotes,
  deductDownvote,
  deductAnswerDeleted,
} from "../services/reputationService.js";

export const Askanswer = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "question unavailable" });
  }

  const { answerbody, useranswered, userid } = req.body;
  const answerAuthorId = userid || req.userid;

  if (!answerbody || !answerbody.trim()) {
    return res.status(400).json({ message: "Answer body cannot be empty" });
  }

  try {
    const questionDoc = await question.findById(_id);
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" });
    }

    const newAnswerId = new mongoose.Types.ObjectId();
    const newAnswer = {
      _id: newAnswerId,
      answerbody,
      useranswered,
      userid: answerAuthorId,
      answeredon: new Date(),
      upvote: [],
      downvote: [],
      isAccepted: false,
      hasAwarded5Upvotes: false,
      hasAwardedAnswerPost: true,
    };

    questionDoc.answer.push(newAnswer);
    questionDoc.noofanswer = questionDoc.answer.length;
    await questionDoc.save();

    // Award +5 reputation points for posting a valid answer
    if (answerAuthorId) {
      await awardAnswerPosted(answerAuthorId, _id, newAnswerId);
    }

    res.status(200).json({ data: questionDoc, answer: newAnswer });
  } catch (error) {
    console.error("Askanswer error:", error);
    res.status(500).json("something went wrong..");
  }
};

export const deleteanswer = async (req, res) => {
  const { id: _id } = req.params;
  const { answerid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "question unavailable" });
  }
  if (!mongoose.Types.ObjectId.isValid(answerid)) {
    return res.status(400).json({ message: "answer unavailable" });
  }

  try {
    const questionDoc = await question.findById(_id);
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answerIndex = questionDoc.answer.findIndex(
      (ans) => ans._id.toString() === String(answerid)
    );

    if (answerIndex === -1) {
      return res.status(404).json({ message: "Answer not found" });
    }

    const targetAnswer = questionDoc.answer[answerIndex];

    // Authorization check: only author or admin can delete
    if (
      req.userid &&
      String(targetAnswer.userid) !== String(req.userid) &&
      req.userrole !== "admin"
    ) {
      return res.status(403).json({ message: "Unauthorized to delete this answer" });
    }

    // Deduct reputation: -5 points for deleting own answer, plus reverse milestones if applicable
    if (targetAnswer.userid) {
      await deductAnswerDeleted(
        targetAnswer.userid,
        _id,
        answerid,
        targetAnswer.isAccepted,
        targetAnswer.hasAwarded5Upvotes
      );
    }

    // If this answer was accepted on the question, clear acceptedAnswerId
    if (
      targetAnswer.isAccepted ||
      questionDoc.acceptedAnswerId === String(answerid)
    ) {
      questionDoc.acceptedAnswerId = null;
    }

    questionDoc.answer.splice(answerIndex, 1);
    questionDoc.noofanswer = questionDoc.answer.length;
    await questionDoc.save();

    res.status(200).json({ data: questionDoc, message: "Answer deleted successfully" });
  } catch (error) {
    console.error("deleteanswer error:", error);
    res.status(500).json("something went wrong..");
  }
};

export const acceptanswer = async (req, res) => {
  const { id: questionId, answerid } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(questionId) ||
    !mongoose.Types.ObjectId.isValid(answerid)
  ) {
    return res.status(400).json({ message: "Invalid question or answer ID" });
  }

  try {
    const questionDoc = await question.findById(questionId);
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Only the question owner can accept an answer
    const currentUserId = req.userid || req.body.userid;
    if (String(questionDoc.userid) !== String(currentUserId)) {
      return res
        .status(403)
        .json({ message: "Only the author of the question can accept an answer" });
    }

    const targetAnswer = questionDoc.answer.find(
      (ans) => ans._id.toString() === String(answerid)
    );

    if (!targetAnswer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    // If answer is already accepted, unaccept it (toggle off)
    if (targetAnswer.isAccepted) {
      targetAnswer.isAccepted = false;
      questionDoc.acceptedAnswerId = null;
      await questionDoc.save();

      // Reverse +10 acceptance bonus
      if (targetAnswer.userid) {
        await reverseAnswerAccepted(targetAnswer.userid, questionId, answerid);
      }

      return res.status(200).json({
        data: questionDoc,
        message: "Answer unaccepted successfully",
        isAccepted: false,
      });
    }

    // If another answer was previously accepted, unaccept it and reverse its bonus
    const previouslyAccepted = questionDoc.answer.find((ans) => ans.isAccepted);
    if (previouslyAccepted) {
      previouslyAccepted.isAccepted = false;
      if (previouslyAccepted.userid) {
        await reverseAnswerAccepted(
          previouslyAccepted.userid,
          questionId,
          previouslyAccepted._id
        );
      }
    }

    // Now accept the new answer
    targetAnswer.isAccepted = true;
    questionDoc.acceptedAnswerId = String(answerid);
    await questionDoc.save();

    // Award +10 reputation points to answer author
    if (targetAnswer.userid) {
      await awardAnswerAccepted(targetAnswer.userid, questionId, answerid);
    }

    res.status(200).json({
      data: questionDoc,
      message: "Answer accepted successfully",
      isAccepted: true,
    });
  } catch (error) {
    console.error("acceptanswer error:", error);
    res.status(500).json("something went wrong..");
  }
};

export const voteanswer = async (req, res) => {
  const { id: questionId, answerid } = req.params;
  const { value } = req.body;
  const voterId = req.userid || req.body.userid;

  if (
    !mongoose.Types.ObjectId.isValid(questionId) ||
    !mongoose.Types.ObjectId.isValid(answerid)
  ) {
    return res.status(400).json({ message: "Invalid question or answer ID" });
  }

  if (!voterId) {
    return res.status(401).json({ message: "Authentication required to vote" });
  }

  try {
    const questionDoc = await question.findById(questionId);
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" });
    }

    const targetAnswer = questionDoc.answer.find(
      (ans) => ans._id.toString() === String(answerid)
    );

    if (!targetAnswer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    // Anti-Abuse: Prevent voting on own answer
    if (String(targetAnswer.userid) === String(voterId)) {
      return res.status(400).json({ message: "You cannot vote on your own answer" });
    }

    targetAnswer.upvote = targetAnswer.upvote || [];
    targetAnswer.downvote = targetAnswer.downvote || [];

    const upIndex = targetAnswer.upvote.findIndex((id) => id === String(voterId));
    const downIndex = targetAnswer.downvote.findIndex((id) => id === String(voterId));

    if (value === "upvote") {
      if (downIndex !== -1) {
        targetAnswer.downvote = targetAnswer.downvote.filter(
          (id) => id !== String(voterId)
        );
      }

      if (upIndex === -1) {
        targetAnswer.upvote.push(String(voterId));

        // Check 5-upvote milestone bonus (+5 once)
        if (targetAnswer.upvote.length >= 5 && !targetAnswer.hasAwarded5Upvotes) {
          targetAnswer.hasAwarded5Upvotes = true;
          if (targetAnswer.userid) {
            await awardAnswerMilestone5Upvotes(targetAnswer.userid, questionId, answerid);
          }
        }
      } else {
        // Toggle off upvote
        targetAnswer.upvote = targetAnswer.upvote.filter(
          (id) => id !== String(voterId)
        );
      }
    } else if (value === "downvote") {
      if (upIndex !== -1) {
        targetAnswer.upvote = targetAnswer.upvote.filter(
          (id) => id !== String(voterId)
        );
      }

      if (downIndex === -1) {
        targetAnswer.downvote.push(String(voterId));
        // Deduct -2 reputation points for receiving downvote
        if (targetAnswer.userid) {
          await deductDownvote(targetAnswer.userid, answerid, "answer", voterId);
        }
      } else {
        // Toggle off downvote
        targetAnswer.downvote = targetAnswer.downvote.filter(
          (id) => id !== String(voterId)
        );
      }
    }

    await questionDoc.save();
    res.status(200).json({ data: questionDoc, answer: targetAnswer });
  } catch (error) {
    console.error("voteanswer error:", error);
    res.status(500).json("something went wrong..");
  }
};
