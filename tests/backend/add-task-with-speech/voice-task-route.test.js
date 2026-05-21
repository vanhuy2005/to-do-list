import { jest } from "@jest/globals";

jest.unstable_mockModule("mime", () => ({
  default: {
    getType: () => "application/json",
    lookup: () => "application/json",
  },
  getType: () => "application/json",
  lookup: () => "application/json",
}));

const mockProcessVoiceTask = jest.fn();
const mockSanitizeVoiceText = jest.fn((text) => String(text).trim());

jest.unstable_mockModule("../../../to-do-list/backend/src/services/aiService.js", () => ({
  sanitizeVoiceText: mockSanitizeVoiceText,
}));

jest.unstable_mockModule("../../../to-do-list/backend/src/services/intentService.js", () => ({
  extractIntent: mockProcessVoiceTask,
}));

const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { default: voiceTaskRouter } = await import(
  "../../../to-do-list/backend/src/routes/voiceTaskRouters.js"
);

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: "test-user" };
    next();
  });
  app.use("/api/v1/voice-task", voiceTaskRouter);
  return app;
};

describe("POST /api/v1/voice-task", () => {
  beforeEach(() => {
    mockProcessVoiceTask.mockReset();
    mockSanitizeVoiceText.mockClear();
  });

  // ── Basic validation ──────────────────────────────────────────────────────

  it("returns 400 when text is missing", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/v1/voice-task").send({});

    expect(response.status).toBe(400);
    expect(response.body?.error?.code).toBe("MISSING_TEXT");
  });

  it("returns 422 when AI returns an error object", async () => {
    mockProcessVoiceTask.mockResolvedValue({
      error: "Không nhận diện được công việc",
      confidence: 0,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "test mic mot hai ba" });

    expect(response.status).toBe(422);
    expect(response.body?.error?.code).toBe("VOICE_TASK_INVALID");
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with normalised draft including title, priority and source", async () => {
    mockProcessVoiceTask.mockResolvedValue({
      title: "Gửi báo cáo",
      priority: "high",
      dueDate: "2026-05-09T10:00:00.000Z",
      tags: ["công việc"],
      confidence: 0.8,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "nhắc mình gửi báo cáo" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe("Gửi báo cáo");
    expect(response.body.data.priority).toBe("high");
    expect(response.body.data.source).toBe("voice");
    expect(mockSanitizeVoiceText).toHaveBeenCalledWith("nhắc mình gửi báo cáo");
  });

  it("returns description and status when AI provides them", async () => {
    mockProcessVoiceTask.mockResolvedValue({
      title: "Viết báo cáo dự án",
      description: "Báo cáo tiến độ sprint 3",
      status: "doing",
      priority: "medium",
      tags: [],
      confidence: 0.9,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "đang viết báo cáo dự án sprint 3" });

    expect(response.status).toBe(200);
    expect(response.body.data.description).toBe("Báo cáo tiến độ sprint 3");
    expect(response.body.data.status).toBe("doing");
  });

  it("returns status null when AI does not mention status", async () => {
    mockProcessVoiceTask.mockResolvedValue({
      title: "Mua sữa",
      priority: "low",
      tags: ["mua sắm"],
      confidence: 0.85,
    });

    const app = buildApp();
    const response = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "nhắc mình mua sữa" });

    expect(response.status).toBe(200);
    // status not mentioned → null (frontend will default to "todo")
    expect(response.body.data.status).toBeNull();
  });

  // ── 429 handling ──────────────────────────────────────────────────────────

  it("returns 429 with Retry-After header when AI queue is full", async () => {
    const queueFullError = new Error("AI queue is full");
    queueFullError.status = 429;
    queueFullError.retryAfter = 10;
    mockProcessVoiceTask.mockRejectedValue(queueFullError);

    const app = buildApp();
    const response = await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "gửi báo cáo cho sếp" });

    expect(response.status).toBe(429);
    expect(response.body?.error?.code).toBe("AI_RATE_LIMIT");
    expect(response.headers["retry-after"]).toBe("10");
  });

  // ── Sanitization ──────────────────────────────────────────────────────────

  it("calls sanitizeVoiceText before processVoiceTask", async () => {
    mockProcessVoiceTask.mockResolvedValue({
      title: "Test",
      confidence: 0.8,
    });

    const app = buildApp();
    await request(app)
      .post("/api/v1/voice-task")
      .send({ text: "  nhắc mình test  " });

    // sanitizeVoiceText mock trims the string
    expect(mockSanitizeVoiceText).toHaveBeenCalledWith("  nhắc mình test  ");
    expect(mockProcessVoiceTask).toHaveBeenCalledWith(
      expect.objectContaining({ transcript: "nhắc mình test" })
    );
  });
});
