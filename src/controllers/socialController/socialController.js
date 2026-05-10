import { ObjectId } from "mongodb";
import { db } from "../../database/db.js";

// Get reactions summary for a content
export const getReactionsSummary = async (req, res) => {
  try {
    const { contentId, contentType } = req.params;

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Aggregate reactions by type
    const summary = await db
      .collection("reactions")
      .aggregate([
        {
          $match: {
            contentId: new ObjectId(contentId),
            contentType: contentType,
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Transform to object format
    const reactions = {
      like: 0,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      support: 0,
      insightful: 0,
    };

    summary.forEach((item) => {
      reactions[item._id] = item.count;
    });

    // Get total count
    const total = Object.values(reactions).reduce(
      (sum, count) => sum + count,
      0,
    );

    res.status(200).json({
      success: true,
      message: "Reactions retrieved successfully",
      data: {
        reactions,
        total,
      },
    });
  } catch (error) {
    console.error("Error getting reactions:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user's reaction for a content
export const getUserReaction = async (req, res) => {
  try {
    const { contentId, contentType } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    const reaction = await db.collection("reactions").findOne({
      contentId: new ObjectId(contentId),
      contentType: contentType,
      userId: userId,
    });

    res.status(200).json({
      success: true,
      message: "User reaction retrieved",
      data: reaction ? reaction.type : null,
    });
  } catch (error) {
    console.error("Error getting user reaction:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle reaction (add/update/remove)
export const toggleReaction = async (req, res) => {
  try {
    const { contentId, contentType, userId, type } = req.body;

    // Validation
    if (!contentId || !contentType || !userId || !type) {
      return res.status(400).json({
        success: false,
        message: "contentId, contentType, userId, and type are required",
      });
    }

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    const validTypes = [
      "like",
      "love",
      "haha",
      "wow",
      "sad",
      "angry",
      "support",
      "insightful",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reaction type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Check if user already reacted
    const existingReaction = await db.collection("reactions").findOne({
      contentId: new ObjectId(contentId),
      contentType: contentType,
      userId: userId,
    });

    if (existingReaction) {
      // If same reaction, remove it (toggle off)
      if (existingReaction.type === type) {
        await db.collection("reactions").deleteOne({
          _id: existingReaction._id,
        });

        return res.status(200).json({
          success: true,
          message: "Reaction removed",
          data: { action: "removed", type: null },
        });
      }

      // If different reaction, update it
      await db.collection("reactions").updateOne(
        { _id: existingReaction._id },
        {
          $set: {
            type: type,
            updatedAt: new Date(),
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: "Reaction updated",
        data: { action: "updated", type: type },
      });
    }

    // Add new reaction
    const newReaction = {
      contentId: new ObjectId(contentId),
      contentType: contentType,
      userId: userId,
      type: type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("reactions").insertOne(newReaction);

    res.status(201).json({
      success: true,
      message: "Reaction added",
      data: { action: "added", type: type },
    });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users who reacted (with optional type filter)
export const getReactionsList = async (req, res) => {
  try {
    const { contentId, contentType } = req.params;
    const { type, page = 1, limit = 50 } = req.query;

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    const query = {
      contentId: new ObjectId(contentId),
      contentType: contentType,
    };

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reactions = await db
      .collection("reactions")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("reactions").countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Reactions list retrieved",
      data: reactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting reactions list:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== COMMENTS ====================

// Get comments for a content
export const getComments = async (req, res) => {
  try {
    const { contentId, contentType } = req.params;
    const { page = 1, limit = 20, sort = "newest" } = req.query;

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    // Determine sort order
    let sortOrder = {};
    if (sort === "oldest") {
      sortOrder = { createdAt: 1 };
    } else if (sort === "popular") {
      sortOrder = { likes: -1, createdAt: -1 };
    } else {
      sortOrder = { createdAt: -1 }; // newest first (default)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get parent comments only (not replies)
    const comments = await db
      .collection("comments")
      .find({
        contentId: new ObjectId(contentId),
        contentType: contentType,
        parentId: null,
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get total count
    const total = await db.collection("comments").countDocuments({
      contentId: new ObjectId(contentId),
      contentType: contentType,
      parentId: null,
    });

    // Get reply counts for each comment
    const commentsWithReplyCount = await Promise.all(
      comments.map(async (comment) => {
        const replyCount = await db.collection("comments").countDocuments({
          parentId: comment._id.toString(),
        });

        return {
          ...comment,
          replyCount,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: commentsWithReplyCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting comments:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get replies for a comment
export const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const replies = await db
      .collection("comments")
      .find({
        parentId: commentId,
      })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("comments").countDocuments({
      parentId: commentId,
    });

    res.status(200).json({
      success: true,
      message: "Replies retrieved successfully",
      data: replies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting replies:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create comment
export const createComment = async (req, res) => {
  try {
    const {
      contentId,
      contentType,
      userId,
      userName,
      userAvatar,
      text,
      parentId,
    } = req.body;

    // Validation
    if (!contentId || !contentType || !userId || !text) {
      return res.status(400).json({
        success: false,
        message: "contentId, contentType, userId, and text are required",
      });
    }

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot be empty",
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot exceed 1000 characters",
      });
    }

    // If it's a reply, validate parent comment exists
    if (parentId) {
      if (!ObjectId.isValid(parentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment ID",
        });
      }

      const parentComment = await db.collection("comments").findOne({
        _id: new ObjectId(parentId),
      });

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
    }

    const commentData = {
      contentId: new ObjectId(contentId),
      contentType: contentType,
      userId: userId,
      userName: userName || "Anonymous",
      userAvatar: userAvatar || "",
      text: text.trim(),
      parentId: parentId || null,
      likes: 0,
      isEdited: false,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("comments").insertOne(commentData);

    // Get the created comment
    const newComment = await db.collection("comments").findOne({
      _id: result.insertedId,
    });

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: newComment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, userId } = req.body;

    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot be empty",
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment text cannot exceed 1000 characters",
      });
    }

    const comment = await db.collection("comments").findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    await db.collection("comments").updateOne(
      { _id: new ObjectId(commentId) },
      {
        $set: {
          text: text.trim(),
          isEdited: true,
          updatedAt: new Date(),
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await db.collection("comments").findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership (admin check can be added here)
    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    // Delete all replies if it's a parent comment
    if (!comment.parentId) {
      await db.collection("comments").deleteMany({
        parentId: commentId,
      });
    }

    // Delete reactions on this comment
    await db.collection("reactions").deleteMany({
      contentId: new ObjectId(commentId),
      contentType: "comment",
    });

    // Delete the comment
    await db.collection("comments").deleteOne({
      _id: new ObjectId(commentId),
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle comment like
export const toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID",
      });
    }

    const comment = await db.collection("comments").findOne({
      _id: new ObjectId(commentId),
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if already liked
    const existingLike = await db.collection("commentLikes").findOne({
      commentId: new ObjectId(commentId),
      userId: userId,
    });

    if (existingLike) {
      // Unlike
      await db.collection("commentLikes").deleteOne({
        _id: existingLike._id,
      });

      await db
        .collection("comments")
        .updateOne({ _id: new ObjectId(commentId) }, { $inc: { likes: -1 } });

      return res.status(200).json({
        success: true,
        message: "Comment unliked",
        data: { liked: false, likes: comment.likes - 1 },
      });
    }

    // Like
    await db.collection("commentLikes").insertOne({
      commentId: new ObjectId(commentId),
      userId: userId,
      createdAt: new Date(),
    });

    await db
      .collection("comments")
      .updateOne({ _id: new ObjectId(commentId) }, { $inc: { likes: 1 } });

    res.status(200).json({
      success: true,
      message: "Comment liked",
      data: { liked: true, likes: comment.likes + 1 },
    });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get comment count
export const getCommentCount = async (req, res) => {
  try {
    const { contentId, contentType } = req.params;

    if (!ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID",
      });
    }

    const total = await db.collection("comments").countDocuments({
      contentId: new ObjectId(contentId),
      contentType: contentType,
    });

    res.status(200).json({
      success: true,
      message: "Comment count retrieved",
      data: { total },
    });
  } catch (error) {
    console.error("Error getting comment count:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
