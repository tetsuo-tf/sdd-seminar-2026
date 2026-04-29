"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { updateInquiryStatus } from "@/lib/inquiries/repository";
import type { ActionState, StatusUpdateInput } from "@/lib/validation";
import { statusUpdateSchema } from "@/lib/validation";

export async function updateInquiryStatusAction(
  _prev: ActionState<StatusUpdateInput>,
  formData: FormData,
): Promise<ActionState<StatusUpdateInput>> {
  const inquiryId = formData.get("inquiryId") as string;
  const nextStatus = formData.get("nextStatus") as string;

  const validation = statusUpdateSchema.safeParse({ inquiryId, nextStatus });

  if (!validation.success) {
    const fieldErrors: Partial<Record<keyof StatusUpdateInput, string>> = {};
    validation.error.errors.forEach((error) => {
      const field = error.path[0] as keyof StatusUpdateInput;
      fieldErrors[field] = error.message;
    });

    return {
      status: "error",
      fieldErrors,
    };
  }

  try {
    await requireRole("it-staff");

    await updateInquiryStatus(
      validation.data.inquiryId,
      validation.data.nextStatus,
    );

    // Revalidate both admin and employee pages to reflect the status change
    revalidatePath("/admin/inquiries");
    revalidatePath("/inquiries");

    return {
      status: "success",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        status: "error",
        formError: "認証が必要です",
      };
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        status: "error",
        formError: "権限がありません",
      };
    }

    throw new Error("ステータスの更新に失敗しました。もう一度お試しください");
  }
}

export async function updateInquiryStatusSimple(formData: FormData) {
  await updateInquiryStatusAction(
    { status: "idle" } as ActionState<StatusUpdateInput>,
    formData,
  );
}
