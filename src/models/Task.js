import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Pending", "In Progress", "Completed", "Overdue"], default: "Pending" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    dueDate: { type: Date, required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    tags: [{ type: String, trim: true }],
    comments: [commentSchema],
    activity: [{ type: String }],
  },
  { timestamps: true },
);

taskSchema.virtual("isOverdue").get(function isOverdue() {
  return !["Completed"].includes(this.status) && this.dueDate < new Date();
});

taskSchema.set("toJSON", { virtuals: true });

export const Task = mongoose.model("Task", taskSchema);
