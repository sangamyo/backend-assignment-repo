import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";

const router = Router();
router.use(protect);

router.get("/summary", async (req, res, next) => {
  try {
    const [tasks, projects, members, completed, overdue] = await Promise.all([
      Task.countDocuments(),
      Project.countDocuments(),
      User.countDocuments(),
      Task.countDocuments({ status: "Completed" }),
      Task.countDocuments({ status: { $ne: "Completed" }, dueDate: { $lt: new Date() } }),
    ]);
    res.json({
      summary: {
        tasks,
        projects,
        members,
        completed,
        overdue,
        completionRate: tasks ? Math.round((completed / tasks) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
