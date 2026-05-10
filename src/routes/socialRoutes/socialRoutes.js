import { Router } from "express";
import {
  // Reactions
  getReactionsSummary,
  getUserReaction,
  toggleReaction,
  getReactionsList,

  // Comments
  getComments,
  getReplies,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getCommentCount,
} from "../../controllers/socialController/socialController.js";

const router = Router();

// Get reactions summary
router.get("/reactions/:contentType/:contentId", getReactionsSummary);

// Get user's reaction
router.get("/reactions/:contentType/:contentId/user", getUserReaction);

// Toggle reaction (add/update/remove)
router.post("/reactions/toggle", toggleReaction);

// Get reactions list with details
router.get("/reactions/:contentType/:contentId/list", getReactionsList);

// Get comments
router.get("/comments/:contentType/:contentId", getComments);

// Get comment count
router.get("/comments/:contentType/:contentId/count", getCommentCount);

// Get replies for a comment
router.get("/comments/replies/:commentId", getReplies);

// Create comment
router.post("/comments", createComment);

// Update comment
router.put("/comments/:commentId", updateComment);

// Delete comment
router.delete("/comments/:commentId", deleteComment);

// Toggle comment like
router.post("/comments/:commentId/like", toggleCommentLike);

export default router;
