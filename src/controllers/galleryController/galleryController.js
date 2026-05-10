import { db } from "../../database/db.js";
import { ObjectId } from "mongodb";
import { deleteFromCloudinary } from "../../middleware/upload.js";

// Get all gallery items (with optional type filter)
export const getGallery = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const query = {};
    
    // Filter by type if provided (photo/video)
    if (type && (type === "photo" || type === "video")) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await db
      .collection("gallery")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("gallery").countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Gallery items retrieved successfully",
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get single gallery item
export const getSingleGallery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    const item = await db.collection("gallery").findOne({
      _id: new ObjectId(id),
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Gallery item retrieved successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create gallery item (photo/video)
export const createGallery = async (req, res) => {
  try {
    const { title, type } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!type || (type !== "photo" && type !== "video")) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'photo' or 'video'",
      });
    }

    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: type === "photo" ? "Photo is required" : "Video is required",
      });
    }

    // Validate file type matches
    if (type === "photo" && !req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file for photo",
      });
    }

    if (type === "video" && !req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        message: "Please upload a video file",
      });
    }

    const fileData = {
      url: req.file.path,
      publicId: req.file.filename,
      format: req.file.mimetype.split("/")[1],
      size: req.file.size,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: type === "photo" ? "image" : "video",
    };

    const galleryData = {
      title: title.trim(),
      type: type,
      file: fileData,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("gallery").insertOne(galleryData);

    res.status(201).json({
      success: true,
      message: `${type === "photo" ? "Photo" : "Video"} added to gallery successfully`,
      data: {
        _id: result.insertedId,
        ...galleryData,
      },
    });
  } catch (error) {
    console.error("Error creating gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update gallery item
export const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    // Check if item exists
    const existingItem = await db.collection("gallery").findOne({
      _id: new ObjectId(id),
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    // Update title if provided
    if (title) {
      updateData.title = title.trim();
    }

    // Handle file update
    if (req.file) {
      // Validate file type matches existing type
      if (existingItem.type === "photo" && !req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Please upload an image file for photo",
        });
      }

      if (existingItem.type === "video" && !req.file.mimetype.startsWith("video/")) {
        return res.status(400).json({
          success: false,
          message: "Please upload a video file",
        });
      }

      // Delete old file from Cloudinary
      if (existingItem.file?.publicId) {
        await deleteFromCloudinary(
          existingItem.file.publicId,
          existingItem.file.resourceType || "image"
        );
      }

      // Set new file
      updateData.file = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.mimetype.split("/")[1],
        size: req.file.size,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        resourceType: existingItem.type === "photo" ? "image" : "video",
      };
    }

    const result = await db
      .collection("gallery")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    // Fetch updated item
    const updatedItem = await db.collection("gallery").findOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Gallery item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete gallery item
export const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gallery ID",
      });
    }

    // Check if item exists
    const existingItem = await db.collection("gallery").findOne({
      _id: new ObjectId(id),
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Gallery item not found",
      });
    }

    // Delete file from Cloudinary
    if (existingItem.file?.publicId) {
      await deleteFromCloudinary(
        existingItem.file.publicId,
        existingItem.file.resourceType || "image"
      );
    }

    // Delete from database
    await db.collection("gallery").deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete multiple gallery items
export const deleteMultipleGallery = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Gallery IDs are required",
      });
    }

    const validIds = ids.filter((id) => ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid gallery IDs provided",
      });
    }

    // Get all items to delete their files
    const items = await db
      .collection("gallery")
      .find({
        _id: { $in: validIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Delete files from Cloudinary
    for (const item of items) {
      if (item.file?.publicId) {
        await deleteFromCloudinary(
          item.file.publicId,
          item.file.resourceType || "image"
        );
      }
    }

    // Delete from database
    const result = await db.collection("gallery").deleteMany({
      _id: { $in: validIds.map((id) => new ObjectId(id)) },
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} gallery items deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting multiple gallery items:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};