import express from "express";
import {
  Askquestion,
  deletequestion,
  getallquestion,
  votequestion,
  voteCloseQuestion,
} from "../controller/question.js";
import auth from "../middleware/auth.js";
import { checkDailyQuestionLimit } from "../middleware/checkDailyLimit.js";
import { requirePrivilege } from "../middleware/privilege.js";

const router = express.Router();

router.post("/ask", auth, checkDailyQuestionLimit, Askquestion);
router.get("/getallquestion", getallquestion);
router.delete("/delete/:id", auth, deletequestion);
router.patch("/vote/:id", auth, votequestion);
router.patch("/close-vote/:id", auth, requirePrivilege("vote_close"), voteCloseQuestion);

export default router;
