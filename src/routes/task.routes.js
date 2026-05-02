import { Router } from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";

const router = Router();
router.use(protect);

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  project: z.string(),
  assignee: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  status: z.enum(["Pending", "In Progress", "Completed", "Overdue"]).default("Pending"),
  dueDate: z.string(),
  tags: z.array(z.string()).default([]),
});

router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find(req.user.role === "Admin" ? {} : { members: req.user._id }).select("_id");
    const projectIds = projects.map((project) => project._id);
    const filter = req.user.role === "Admin"
      ? { project: { $in: projectIds } }
      : { project: { $in: projectIds }, $or: [{ assignee: req.user._id }, { assignee: null }] };
    const tasks = await Task.find(filter).populate("project", "name members owner").populate("assignee", "name email role avatarColor");
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = taskSchema.parse(req.body);
    const project = await Project.findById(payload.project);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (req.user.role !== "Admin" && !project.members.some((member) => String(member) === String(req.user._id))) {
      return res.status(403).json({ message: "Only assigned project members can create tasks here" });
    }
    
    // Auto-add assignee to project members if not already present
    if (payload.assignee) {
      const assigneeExists = project.members.some((member) => String(member) === String(payload.assignee));
      if (!assigneeExists) {
        project.members.push(payload.assignee);
        await project.save();
      }
    }
    
    const progress = payload.status === "Completed" ? 100 : payload.status === "In Progress" ? 50 : payload.status === "Overdue" ? 20 : 0;
    const task = await Task.create({ ...payload, progress, dueDate: new Date(payload.dueDate), activity: [`${req.user.name} created task`] });
    const populated = await task.populate("project assignee", "name email role avatarColor members owner");
    res.status(201).json({ task: populated });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["Pending", "In Progress", "Completed", "Overdue"]) }).parse(req.body);
    const existing = await Task.findById(req.params.id).populate("project");
    if (!existing) return res.status(404).json({ message: "Task not found" });
    const canUpdate = req.user.role === "Admin" || String(existing.assignee) === String(req.user._id);
    if (!canUpdate) return res.status(403).json({ message: "Members can update only their own tasks" });
    const progress = status === "Completed" ? 100 : status === "In Progress" ? 50 : status === "Overdue" ? 20 : 0;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status, progress, $push: { activity: `${req.user.name} moved task to ${status}` } },
      { new: true },
    ).populate("project assignee", "name email role avatarColor members owner");
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = taskSchema.partial().parse(req.body);
    const existing = await Task.findById(req.params.id).populate("project");
    if (!existing) return res.status(404).json({ message: "Task not found" });
    const canEdit = req.user.role === "Admin" || String(existing.assignee) === String(req.user._id);
    if (!canEdit) return res.status(403).json({ message: "Members can edit only their own tasks" });
    if (payload.assignee && !existing.project.members.some((member) => String(member) === String(payload.assignee))) {
      return res.status(400).json({ message: "Assignee must be a member of the project" });
    }
    const updates = { ...payload };
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    if (updates.status) updates.progress = updates.status === "Completed" ? 100 : updates.status === "In Progress" ? 50 : updates.status === "Overdue" ? 20 : 0;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...updates, $push: { activity: `${req.user.name} edited task` } },
      { new: true },
    ).populate("project assignee", "name email role avatarColor members owner");
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (req.user.role !== "Admin" && String(task.assignee) !== String(req.user._id)) {
      return res.status(403).json({ message: "Members can delete only their own tasks" });
    }
    await task.deleteOne();
    res.json({ message: "Task deleted" });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1) }).parse(req.body);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, body }, activity: `${req.user.name} commented` } },
      { new: true },
    );
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

export default router;
