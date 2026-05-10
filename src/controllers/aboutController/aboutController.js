import { db } from "../../database/db.js";
import { deleteFromCloudinary } from "../../middleware/upload.js";

// Get About
export const getAbout = async (req, res) => {
  try {
    const result = await db.collection("about").findOne({});

    if (!result) {
      return res.status(200).json({
        success: true,
        message: "About section is empty",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "About fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("About fetching error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create About
export const createAbout = async (req, res) => {
  try {
    const { title, description } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Check if about already exists
    const existingAbout = await db.collection("about").findOne({});

    if (existingAbout) {
      return res.status(400).json({
        success: false,
        message: "About already exists. Use update instead.",
      });
    }

    // Handle image
    let imageData = null;
    if (req.file) {
      imageData = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.mimetype.split("/")[1],
        size: req.file.size,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      };
    }

    const aboutData = {
      title,
      description: description || "",
      image: imageData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("about").insertOne(aboutData);

    res.status(201).json({
      success: true,
      message: "About created successfully",
      data: {
        _id: result.insertedId,
        ...aboutData,
      },
    });
  } catch (error) {
    console.error("About creation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update About
export const updateAbout = async (req, res) => {
  try {
    const { title, description } = req.body;

    // Check if about exists
    const existingAbout = await db.collection("about").findOne({});

    if (!existingAbout) {
      return res.status(404).json({
        success: false,
        message: "About not found. Create one first.",
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    // Update title if provided
    if (title !== undefined) {
      updateData.title = title;
    }

    // Update description if provided
    if (description !== undefined) {
      updateData.description = description;
    }

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary
      if (existingAbout.image?.publicId) {
        await deleteFromCloudinary(
          existingAbout.image.publicId,
          "image"
        ).catch((err) => {
          console.error("Failed to delete old image:", err);
        });
      }

      // Set new image
      updateData.image = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.mimetype.split("/")[1],
        size: req.file.size,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      };
    }

    const result = await db
      .collection("about")
      .updateOne({ _id: existingAbout._id }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "About update failed",
      });
    }

    // Fetch updated about
    const updatedAbout = await db
      .collection("about")
      .findOne({ _id: existingAbout._id });

    res.status(200).json({
      success: true,
      message: "About updated successfully",
      data: updatedAbout,
    });
  } catch (error) {
    console.error("About update error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete About Image Only
export const deleteAboutImage = async (req, res) => {
  try {
    const existingAbout = await db.collection("about").findOne({});

    if (!existingAbout) {
      return res.status(404).json({
        success: false,
        message: "About not found",
      });
    }

    if (!existingAbout.image?.publicId) {
      return res.status(400).json({
        success: false,
        message: "No image to delete",
      });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(existingAbout.image.publicId, "image");

    // Remove image from database
    await db.collection("about").updateOne(
      { _id: existingAbout._id },
      {
        $set: { image: null, updatedAt: new Date() },
      }
    );

    res.status(200).json({
      success: true,
      message: "About image deleted successfully",
    });
  } catch (error) {
    console.error("About image delete error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};