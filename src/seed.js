import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Project } from "./models/Project.js";
import { Task } from "./models/Task.js";

await connectDB();
await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany()]);

const users = await User.create([
  { name: "Hariom", email: "admin@quantum.team", password: "password123", role: "Admin", avatarColor: "cyan" },
  { name: "Aarav", email: "aarav@quantum.team", password: "password123", role: "Member", avatarColor: "violet" },
  { name: "Mira", email: "mira@quantum.team", password: "password123", role: "Member", avatarColor: "emerald" },
]);

const project = await Project.create({
  name: "VisionOS Hiring Demo",
  description: "Recruiter-ready full-stack sprint with immersive 3D UI.",
  owner: users[0]._id,
  members: users.map((user) => user._id),
  deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
});

await Task.create([
  {
    title: "Ship holographic landing page",
    project: project._id,
    assignee: users[0]._id,
    status: "Completed",
    priority: "High",
    dueDate: new Date(),
    progress: 100,
  },
  {
    title: "Connect JWT auth to protected routes",
    project: project._id,
    assignee: users[1]._id,
    status: "In Progress",
    priority: "Critical",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    progress: 68,
  },
  {
    title: "Prepare Railway deployment",
    project: project._id,
    assignee: users[2]._id,
    status: "Pending",
    priority: "High",
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    progress: 20,
  },
]);

console.log("Seed complete: admin@quantum.team / password123");
await mongoose.disconnect();
