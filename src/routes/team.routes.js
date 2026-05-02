import { Router } from "express";
import { z } from "zod";
import { protect, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const members = await User.find().select("name email role avatarColor createdAt");
    res.json({ members });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    const payload = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8).default("password123"),
      role: z.enum(["Admin", "Member"]).default("Member"),
      avatarColor: z.string().default("cyan"),
    }).parse(req.body);
    const existing = await User.findOne({ email: payload.email });
    if (existing) return res.status(409).json({ message: "Member email already exists" });
    const member = await User.create(payload);
    res.status(201).json({ member: member.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const payload = z.object({
      name: z.string().min(2).optional(),
      role: z.enum(["Admin", "Member"]).optional(),
      avatarColor: z.string().optional(),
    }).parse(req.body);
    const member = await User.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json({ member: member.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: "Admins cannot remove themselves" });
    }
    const member = await User.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    await Project.updateMany({}, { $pull: { members: req.params.id } });
    await Task.updateMany({ assignee: req.params.id }, { $unset: { assignee: "" } });
    res.json({ message: "Member removed and relationships updated" });
  } catch (error) {
    next(error);
  }
});

export default router;
