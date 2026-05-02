import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { signToken } from "../utils/token.js";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["Admin", "Member"]).default("Member"),
});

router.post("/signup", async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const existing = await User.findOne({ email: payload.email });
    if (existing) return res.status(409).json({ message: "Email already registered" });
    const user = await User.create(payload);
    res.status(201).json({ user: user.toSafeJSON(), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json({ user: user.toSafeJSON(), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    z.object({ email: z.string().email() }).parse(req.body);
    res.json({ message: "Password reset flow queued. Configure email provider in production." });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

export default router;
