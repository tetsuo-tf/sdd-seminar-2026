import { z } from "zod";
import { CATEGORY_VALUES, STATUS_VALUES } from "@/lib/inquiries/types";

export const signupSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上である必要があります"),
  name: z
    .string()
    .min(1, "名前を入力してください")
    .max(60, "名前は60文字以下である必要があります"),
});

export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const inquirySchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(120, "タイトルは120文字以下である必要があります"),
  category: z.enum(CATEGORY_VALUES, {
    errorMap: () => ({ message: "有効なカテゴリを選択してください" }),
  }),
  body: z
    .string()
    .min(1, "本文を入力してください")
    .max(2000, "本文は2000文字以下である必要があります"),
});

export const statusUpdateSchema = z.object({
  inquiryId: z.string().min(1, "問合せIDが必要です"),
  nextStatus: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: "有効なステータスを選択してください" }),
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

export type ActionFieldErrors<T> = Partial<Record<keyof T, string>>;

export type ActionState<T> =
  | { status: "idle" }
  | { status: "error"; formError?: string; fieldErrors?: ActionFieldErrors<T> }
  | { status: "success" };
