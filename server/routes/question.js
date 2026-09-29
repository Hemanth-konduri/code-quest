import express from "express";
import {
  Askquestion,
  deletequestion,
  getallquestion,
  votequestion,
} from "../controller/question.js";
import auth from "../middleware/auth.js";
import { checkDailyQuestionLimit } from "../middleware/checkDailyLimit.js";

const router = express.Router();

router.post("/ask", auth, checkDailyQuestionLimit, Askquestion);
router.get("/getallquestion", getallquestion);
router.delete("/delete/:id", auth, deletequestion);
router.patch("/vote/:id", auth, votequestion);

export default router;
