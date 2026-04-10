import { useMemo, useState } from "react";
import { BotIcon, SendIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import aiService from "@/services/aiService";
import taskService from "@/services/taskService";

const INITIAL_MESSAGE = {
  role: "assistant",
  text: "Xin chào! Tôi có thể hỗ trợ bạn về task, deadline, profile và danh sách công việc.",
};

const getTasksFromPayload = (payload) => {
  if (Array.isArray(payload?.data?.tasks)) {
    return payload.data.tasks;
  }

  if (Array.isArray(payload?.tasks)) {
    return payload.tasks;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const normalizeTasksForAI = (tasks) => {
  return tasks.slice(0, 20).map((task) => ({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "",
    priority: task?.priority || "",
    dueDate: task?.dueDate || null,
  }));
};

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(
    () => input.trim().length >= 3 && !isSending,
    [input, isSending],
  );

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isSending) {
      return;
    }

    setIsSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);

    try {
      const taskPayload = await taskService.getTasks({
        page: 1,
        limit: 20,
        sort: "updatedAt",
        order: "desc",
      });
      const tasks = normalizeTasksForAI(getTasksFromPayload(taskPayload));

      const aiPayload = await aiService.askAssistant({
        message: prompt,
        tasks,
      });
      const answer =
        aiPayload?.data?.answer ||
        "Xin lỗi, hiện tại tôi chưa thể trả lời. Bạn thử lại sau nhé.";

      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        "Không thể kết nối AI assistant. Bạn kiểm tra server backend và GEMINI_API_KEY.";

      setMessages((prev) => [...prev, { role: "assistant", text: message }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {open && (
        <section
          className="fixed bottom-24 left-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border-[3px] border-border bg-background comic-shadow"
          style={{ position: "fixed", left: 16, bottom: 96, zIndex: 9998 }}
        >
          <header className="flex items-center justify-between border-b-[3px] border-border bg-secondary/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <BotIcon className="size-4" />
              <p className="text-sm font-black uppercase leading-none">
                Task AI
              </p>
            </div>

            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label="Đóng chat AI"
              onClick={() => setOpen(false)}
            >
              <XIcon className="size-3" />
            </Button>
          </header>

          <div className="max-h-80 space-y-2 overflow-auto px-3 py-3">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <article
                  key={`${message.role}-${index}`}
                  className={`rounded-lg border-2 border-border px-2.5 py-2 text-sm leading-relaxed ${
                    isUser ? "bg-primary/15" : "bg-muted/40"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                    {isUser ? "Bạn" : "AI"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </article>
              );
            })}
          </div>

          <div className="space-y-2 border-t-[3px] border-border p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Hỏi về tạo task, sửa profile, đánh giá danh sách công việc..."
            />

            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!canSend}
              onClick={handleSend}
            >
              <SendIcon className="size-4" />
              {isSending ? "Đang trả lời..." : "Gửi cho AI"}
            </Button>
          </div>
        </section>
      )}

      <Button
        type="button"
        size="default"
        className="fixed bottom-24 left-4 z-30 rounded-full px-3"
        aria-label="Mở AI assistant"
        onClick={() => setOpen((prev) => !prev)}
        style={{ position: "fixed", left: 16, bottom: 96, zIndex: 9999 }}
      >
        <BotIcon className="size-5" />
        AI Chat
      </Button>
    </>
  );
}
