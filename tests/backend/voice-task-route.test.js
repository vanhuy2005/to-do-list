import { jest } from "@jest/globals";

// Mock Intent Service
const mockExtractIntent = jest.fn();
jest.unstable_mockModule("../../to-do-list/backend/src/services/intentService.js", () => ({
  extractIntent: mockExtractIntent
}));

// Imports after mocking
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { default: voiceRouter } = await import("../../to-do-list/backend/src/routes/voiceTaskRouters.js");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/voice-task", voiceRouter);
  return app;
};

describe("Voice Task Route Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 when text is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/voice-task")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MISSING_TEXT");
  });

  it("should return 400 when text is too short", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "đi" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VOICE_TOO_SHORT");
  });

  it("should successfully extract intent and return unified schema", async () => {
    const mockTask = {
      title: "Gửi báo cáo",
      description: "Nộp bản PDF",
      datePhrase: "5 giờ chiều",
      dueDate: "2026-05-22T17:00:00.000Z",
      priority: "high",
      tags: ["work"],
      confidence: 0.95
    };
    mockExtractIntent.mockResolvedValue(mockTask);

    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "Gửi báo cáo lúc 5 giờ chiều" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.objectContaining({
      title: "Gửi báo cáo",
      description: "Nộp bản PDF",
      datePhrase: "5 giờ chiều",
      dueDate: "2026-05-22T17:00:00.000Z",
      priority: "high",
      tags: ["work"],
      confidence: 0.95,
      rawTranscript: "Gửi báo cáo lúc 5 giờ chiều",
      source: "voice",
      request_id: expect.any(String),
      is_fallback: false
    }));

    // Ensure status field from the old validator is NOT present
    expect(res.body.data.status).toBeNull();
  });

  it("should return 422 if intent extraction indicates invalid voice task", async () => {
    mockExtractIntent.mockResolvedValue({ error: "Không chắc chắn đây là task." });

    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "nói linh tinh gì đó" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VOICE_TASK_INVALID");
  });

  it("should return 500 when intent extraction throws", async () => {
    mockExtractIntent.mockRejectedValue(new Error("Fatal extraction error"));

    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "Gửi báo cáo lúc 5 giờ chiều" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VOICE_TASK_ERROR");
  });
});
