import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Event from "./models/Event.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Ingest one event. The API validates the event rather than trusting browser input.
app.post("/api/events", async (req, res, next) => {
  try {
    const { session_id, event_type, page_url, timestamp, x, y, viewport_width, viewport_height } = req.body ?? {};
    if (typeof session_id !== "string" || !session_id.trim() || session_id.length > 128) {
      return res.status(400).json({ error: "session_id must be a non-empty string (max 128 chars)." });
    }
    if (!["page_view", "click"].includes(event_type)) {
      return res.status(400).json({ error: "event_type must be page_view or click." });
    }
    let parsedUrl;
    try { parsedUrl = new URL(page_url); } catch { return res.status(400).json({ error: "page_url must be a valid absolute URL." }); }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "Only HTTP(S) page URLs are accepted." });
    }
    const eventDate = new Date(timestamp);
    if (!timestamp || Number.isNaN(eventDate.getTime())) return res.status(400).json({ error: "timestamp must be a valid date." });

    const doc = {
      session_id: session_id.trim(), event_type, page_url: parsedUrl.href,
      timestamp: eventDate
    };
    if (event_type === "click") {
      if (![x, y, viewport_width, viewport_height].every(Number.isFinite) ||
          x < 0 || y < 0 || viewport_width <= 0 || viewport_height <= 0) {
        return res.status(400).json({ error: "Click events require non-negative x/y and positive viewport dimensions." });
      }
      doc.x = x; doc.y = y; doc.viewport_width = viewport_width; doc.viewport_height = viewport_height;
    }
    const saved = await Event.create(doc);
    res.status(201).json({ id: saved.id, message: "Event stored." });
  } catch (error) { next(error); }
});

// Session list with event counts and time boundaries.
app.get("/api/sessions", async (_req, res, next) => {
  try {
    const sessions = await Event.aggregate([
      { $group: {
        _id: "$session_id",
        total_events: { $sum: 1 },
        first_seen: { $min: "$timestamp" },
        last_seen: { $max: "$timestamp" },
        page_urls: { $addToSet: "$page_url" }
      }},
      { $sort: { last_seen: -1 } },
      { $project: { _id: 0, session_id: "$_id", total_events: 1, first_seen: 1, last_seen: 1, page_urls: 1 } }
    ]);
    res.json(sessions);
  } catch (error) { next(error); }
});

// Ordered event timeline for one session.
app.get("/api/sessions/:sessionId/events", async (req, res, next) => {
  try {
    const events = await Event.find({ session_id: req.params.sessionId })
      .sort({ timestamp: 1, _id: 1 }).lean();
    res.json(events);
  } catch (error) { next(error); }
});

// Distinct pages are used to populate the heatmap page selector.
app.get("/api/pages", async (_req, res, next) => {
  try {
    const pages = await Event.distinct("page_url");
    res.json(pages.sort());
  } catch (error) { next(error); }
});

// Click positions for one exact page URL.
app.get("/api/heatmap", async (req, res, next) => {
  try {
    const pageUrl = req.query.page_url;
    if (typeof pageUrl !== "string" || !pageUrl) return res.status(400).json({ error: "page_url query parameter is required." });
    const clicks = await Event.find({ page_url: pageUrl, event_type: "click" })
      .select("x y viewport_width viewport_height timestamp session_id -_id")
      .sort({ timestamp: -1 }).lean();
    res.json({ page_url: pageUrl, total_clicks: clicks.length, clicks });
  } catch (error) { next(error); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing. Copy server/.env.example to server/.env.");
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`Analytics API listening on http://localhost:${PORT}`));
}
start().catch(err => { console.error("Failed to start API:", err.message); process.exit(1); });
