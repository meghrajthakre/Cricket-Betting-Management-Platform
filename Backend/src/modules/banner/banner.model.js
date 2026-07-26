"use strict";
const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Banner text is required"],
      trim: true,
      maxlength: [500, "Banner text cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
