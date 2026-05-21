import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import AvatarUpload from "@/components/settings/AvatarUpload";
import NotificationSection from "@/components/settings/NotificationSection";
import api from "@/lib/axios";

// ── 1. Mocks ────────────────────────────────────────────────────────────────
vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }) => (
    <select data-testid="select-element" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog-element">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

describe("AvatarUpload Component", () => {
  const onAvatarChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initials fallback when avatarUrl is empty", () => {
    render(
      <AvatarUpload
        avatarUrl=""
        displayName="Huy Nguyễn"
        onAvatarChange={onAvatarChangeMock}
      />
    );

    // Initial letters of "Huy Nguyễn" should be HN
    expect(screen.getByText("HN")).toBeInTheDocument();
  });

  it("renders the profile image when avatarUrl is provided", () => {
    render(
      <AvatarUpload
        avatarUrl="https://example.com/avatar.jpg"
        displayName="Huy Nguyễn"
        onAvatarChange={onAvatarChangeMock}
      />
    );

    const img = screen.getByRole("img", { name: /profile/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("handles successful file upload on file selection", async () => {
    api.post.mockResolvedValue({
      success: true,
      data: {
        avatarUrl: "https://cloudinary.com/new-avatar.jpg",
      },
    });

    render(
      <AvatarUpload
        avatarUrl=""
        displayName="Huy Nguyễn"
        onAvatarChange={onAvatarChangeMock}
      />
    );

    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    const input = screen.getByTestId("avatar-file-input");

    // Simulate selecting a file
    fireEvent.change(input, { target: { files: [file] } });

    // Verify optimistic UI preview is generated using blob URL
    expect(screen.getByRole("img", { name: /profile/i })).toHaveAttribute("src", "blob:mock-url");

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/profile/avatar", expect.any(FormData), expect.any(Object));
      expect(onAvatarChangeMock).toHaveBeenCalledWith("https://cloudinary.com/new-avatar.jpg");
    });
  });

  it("triggers confirmation modal and deletes avatar successfully", async () => {
    api.delete.mockResolvedValue({
      success: true,
    });

    render(
      <AvatarUpload
        avatarUrl="https://example.com/avatar.jpg"
        displayName="Huy Nguyễn"
        onAvatarChange={onAvatarChangeMock}
      />
    );

    // Click "Gỡ ảnh" button
    const deleteBtn = screen.getByRole("button", { name: /xóa/i });
    fireEvent.click(deleteBtn);

    // Verify the confirmation dialog is opened
    expect(screen.getByTestId("dialog-element")).toBeInTheDocument();

    // Click confirmation "Xác nhận gỡ" button inside dialog
    const confirmBtn = screen.getByRole("button", { name: /xác nhận gỡ/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/profile/avatar");
      expect(onAvatarChangeMock).toHaveBeenCalledWith(null);
    });
  });
});

describe("NotificationSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches preferences and history on mount and renders them correctly", async () => {
    const mockPrefs = {
      emailOverdue: true,
      emailDigest: false,
      digestHour: 9,
      timezone: "Asia/Ho_Chi_Minh",
    };

    const mockHistory = {
      logs: [
        {
          _id: "log-1",
          type: "overdue_single",
          status: "sent",
          createdAt: "2026-05-21T08:00:00.000Z",
          taskSnapshot: { title: "Overdue Task 1" },
        },
      ],
      pagination: {
        page: 1,
        totalPages: 1,
        total: 1,
      },
    };

    api.get.mockImplementation((url) => {
      if (url.includes("/preferences")) {
        return Promise.resolve({ success: true, data: mockPrefs });
      }
      if (url.includes("/history")) {
        return Promise.resolve({ success: true, data: mockHistory });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(<NotificationSection />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/profile/notifications/preferences");
      expect(api.get).toHaveBeenCalledWith("/profile/notifications/history?page=1&limit=5");
    });

    // Check if the switches and inputs show fetched values
    const overdueLabel = screen.getByText(/Báo công việc quá hạn/i);
    const overdueToggle = overdueLabel.closest("div").parentElement.querySelector("button");
    expect(overdueToggle.className).toContain("bg-[#ffd400]");

    const digestLabel = screen.getByText(/Báo cáo tổng hợp hàng ngày/i);
    const digestToggle = digestLabel.closest("div").parentElement.querySelector("button");
    expect(digestToggle.className).toContain("bg-muted");

    // Verify rendered notification log
    expect(screen.getByText(/Overdue Task 1/i)).toBeInTheDocument();
    expect(screen.getByText(/THÀNH CÔNG/i)).toBeInTheDocument();
  });

  it("handles preference updates optimistically and calls put API", async () => {
    const mockPrefs = {
      emailOverdue: true,
      emailDigest: true,
      digestHour: 8,
      timezone: "Asia/Ho_Chi_Minh",
    };

    api.get.mockImplementation((url) => {
      if (url.includes("/preferences")) {
        return Promise.resolve({ success: true, data: mockPrefs });
      }
      if (url.includes("/history")) {
        return Promise.resolve({ success: true, data: { logs: [], pagination: { page: 1, totalPages: 1 } } });
      }
    });

    api.put.mockResolvedValue({
      success: true,
      data: {
        ...mockPrefs,
        emailOverdue: false,
      },
    });

    render(<NotificationSection />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/profile/notifications/preferences");
    });

    const overdueLabel = screen.getByText(/Báo công việc quá hạn/i);
    const overdueToggle = overdueLabel.closest("div").parentElement.querySelector("button");
    expect(overdueToggle.className).toContain("bg-[#ffd400]");

    // Toggle the checkbox
    fireEvent.click(overdueToggle);

    // Verify optimistic change and API call
    expect(overdueToggle.className).toContain("bg-muted");
    expect(api.put).toHaveBeenCalledWith("/profile/notifications/preferences", { emailOverdue: false });
  });
});
