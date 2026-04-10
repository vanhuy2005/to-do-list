import { z } from "zod";

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(120, "Tiêu đề không được vượt quá 120 ký tự")
    .trim(),
  description: z
    .string()
    .max(2000, "Mô tả không được vượt quá 2000 ký tự")
    .trim()
    .optional()
    .or(z.literal("")),
  status: z.enum(["todo", "doing", "done"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Độ ưu tiên không hợp lệ" }),
  }),
  dueDate: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !Number.isNaN(date.getTime());
      },
      { message: "Thời hạn không hợp lệ" },
    )
    .optional()
    .or(z.literal("")),
  tags: z
    .array(z.string().trim())
    .max(8, "Tối đa 8 thẻ phân loại")
    .optional()
    .default([]),
});

export const taskDefaultValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  tags: [],
};
