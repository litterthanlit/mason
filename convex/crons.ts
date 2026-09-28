import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("clean up abandoned garment scans", { hourUTC: 4, minuteUTC: 17 }, internal.recognition.cleanupStaleJobs, {});

export default crons;
