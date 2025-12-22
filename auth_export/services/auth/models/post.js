import mongoose from "mongoose";
const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    userName: {
      type: String,
      required: true,
    },

    userAvatarUrl: {
      type: String,
      default: null,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    tags: {
      type: [String],
      default: [],
    },

    likeCount: {
      type: Number,
      default: 0,
    },

    commentCount: {
      type: Number,
      default: 0,
    },

    shareCount: {
      type: Number,
      default: 0,
    },

    isLiked: {
      type: Boolean,
      default: false,
    },

    isSaved: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true 
  }
);

export default mongoose.model("Post", postSchema);
