import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewTaskPage from "@/pages/NewTaskPage";
import taskService from "@/services/taskService";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/TaskModalShell", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/TaskModalTopBar", () => ({
  default: () => <div>Task Modal Top Bar</div>,
}));

vi.mock("@/components/DeadlinePicker", () => ({
  default: () => <div>Deadline Picker</div>,
}));

vi.mock("@/components/VoiceMicButton", () => ({
  default: ({ onDraftReady }) => (
    <button
      type="button"
      onClick={() =>
        onDraftReady(
          { title: "Gửi báo cáo", priority: "medium", tags: ["công việc"] },
          "nhắc mình gửi báo cáo",
        )
      }
    >
      Mock Voice
    </button>
  ),
}));

vi.mock("@/services/taskService", () => ({
  default: {
    createTask: vi.fn(),
  },
}));

describe("NewTaskPage voice flow", () => {
  it("shows preview and creates task from voice draft", async () => {
    taskService.createTask.mockResolvedValue({});

    render(<NewTaskPage />);

    fireEvent.click(screen.getByRole("button", { name: /mock voice/i }));

    expect(screen.getByText(/ai draft/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tạo task/i }));

    await waitFor(() => {
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Gửi báo cáo",
          status: "todo",
          priority: "medium",
        }),
      );
    });
  });
});
