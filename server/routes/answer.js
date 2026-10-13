import {
  Askanswer,
  deleteanswer,
  acceptanswer,
  voteanswer,
} from "../controller/answer.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/postanswer/:id", auth, Askanswer);
router.delete("/delete/:id", auth, deleteanswer);
router.patch("/accept/:id/:answerid", auth, acceptanswer);
router.patch("/vote/:id/:answerid", auth, voteanswer);

export default router;
