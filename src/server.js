import "dotenv/config";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ API Server listening on port ${port}`);
      console.log(`📍 URL: ${process.env.NODE_ENV === "production" ? process.env.RAILWAY_PUBLIC_DOMAIN || "https://your-railway-url.up.railway.app" : `http://localhost:${port}`}`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });
