import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true,
  },
  wpm: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
    required: true,
  },
  language: {
    type: String,
    enum: ["en", "bn"],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  mode: {
    type: String,
    required: true,
  },
  testType: {
    type: String,
    default: "Standard",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  correctStrokes: {
    type: Number,
    required: false,
  },
  correctWords: {
    type: Number,
    required: false,
  },
  totalWords: {
    type: Number,
    required: false,
  },
  strokeWiseCorrectWords: {
    type: Number,
    required: false,
  },
  wordTimings: {
    type: [
      {
        word: { type: String },
        durationMs: { type: Number },
        wpm: { type: Number },
        strokeCount: { type: Number },
        status: { type: String },
      },
    ],
    required: false,
  },
});

// Using a new model name 'TypingTestReportV2' to ensure schema changes are picked up without server restart
// We explicitly map it to the 'reports' collection to keep data in one place
export default mongoose.models.TypingTestReportV2 ||
  mongoose.model("TypingTestReportV2", ReportSchema, "reports");
