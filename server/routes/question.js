import express from "express";
import {
  Askquestion,
  deletequestion,
  getallquestion,
  votequestion,
} from "../controller/question.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/ask", auth, Askquestion);
router.get("/getallquestion", getallquestion);
router.delete("/delete/:id", auth, deletequestion);
router.patch("/vote/:id", auth, votequestion);

export default router;
