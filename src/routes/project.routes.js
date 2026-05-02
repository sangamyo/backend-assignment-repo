import { Router } from "express";
import { z } from "zod";
import { protect, requireRole } from "../middleware/auth.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";

const router = Router();
router.use(protect);

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  deadline: z.string().datetime().or(z.string()),
  members: z.array(z.string()).default([]),
  status: z.enum(["Planning", "Active", "Paused", "Completed"]).default("Active"),
});

router.get("/", async (req, res, next) => {
  try {
    const filter = req.user.role === "Admin" ? {} : { members: req.user._id };
    const projects = await Project.find(filter).populate("owner members", "name email role avatarColor");
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    const payload = projectSchema.parse(req.body);
    const members = [...new Set([String(req.user._id), ...payload.members])];
    const count = await User.countDocuments({ _id: { $in: members } });
    if (count !== members.length) return res.status(400).json({ message: "One or more members do not exist" });
    const existing = await Project.findOne({ owner: req.user._id, name: payload.name });
    if (existing) return res.status(409).json({ message: "Project name must be unique for this admin" });
    const project = await Project.create({
      ...payload,
      deadline: new Date(payload.deadline),
      owner: req.user._id,
      members,
    });
    const populated = await project.populate("owner members", "name email role avatarColor");
    res.status(201).json({ project: populated });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    if (updates.members) {
      const members = [...new Set([String(req.user._id), ...updates.members])];
      const count = await User.countDocuments({ _id: { $in: members } });
      if (count !== members.length) return res.status(400).json({ message: "One or more members do not exist" });
      updates.members = members;
    }
    const project = await Project.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, updates, { new: true })
      .populate("owner members", "name email role avatarColor");
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: "Project not found" });
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: "Project and related tasks deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
