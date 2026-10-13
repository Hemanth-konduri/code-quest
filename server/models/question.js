import mongoose from "mongoose";

const questionschema = mongoose.Schema(
  {
    questiontitle: { type: String, required: true },
    questionbody: { type: String, required: true },
    questiontags: { type: [String], required: true },
    noofanswer: { type: Number, default: 0 },
    upvote: { type: [String], default: [] },
    downvote: { type: [String], default: [] },
    userposted: { type: String },
    userid: { type: String },
    askedon: { type: Date, default: Date.now },
    acceptedAnswerId: { type: String, default: null },
    hasAwarded10Upvotes: { type: Boolean, default: false },
    closeVotes: { type: [String], default: [] },
    isClosed: { type: Boolean, default: false },
    answer: [
      {
        answerbody: String,
        useranswered: String,
        userid: String,
        answeredon: { type: Date, default: Date.now },
        upvote: { type: [String], default: [] },
        downvote: { type: [String], default: [] },
        isAccepted: { type: Boolean, default: false },
        hasAwarded5Upvotes: { type: Boolean, default: false },
        hasAwardedAnswerPost: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("question", questionschema);
