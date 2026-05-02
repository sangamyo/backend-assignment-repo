import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import teamRoutes from "./routes/team.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();

// Security and middleware
app.use(helmet());

// CORS Configuration - Support multiple frontends
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://team-management-web-folder-files-22a19oglb.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith("vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));

// Root route - Backend is live
app.get("/", (req, res) => {
  res.json({
    message: "Backend is live",
    service: "quantum-task-api",
    timestamp: new Date().toISOString(),
  });
});

// Health check routes
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "quantum-task-api",
    uptime: process.uptime(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "quantum-task-api",
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dashboard", analyticsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);
