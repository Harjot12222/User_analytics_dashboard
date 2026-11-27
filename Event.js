import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true, trim: true, maxlength: 128 },
  event_type: { type: String, required: true, enum: ["page_view", "click"], index: true },
  page_url: { type: String, required: true, maxlength: 2048 },
  timestamp: { type: Date, required: true, index: true },
  // Click coordinates are CSS-pixel coordinates relative to the viewport.
  x: { type: Number, min: 0 },
  y: { type: Number, min: 0 },
  viewport_width: { type: Number, min: 1 },
  viewport_height: { type: Number, min: 1 }
}, { versionKey: false });

eventSchema.index({ session_id: 1, timestamp: 1 });
eventSchema.index({ page_url: 1, event_type: 1, timestamp: -1 });

export default mongoose.model("Event", eventSchema);
