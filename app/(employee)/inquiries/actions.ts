import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { createInquiry } from "@/lib/inquiries/repository";
import type { ActionState, InquiryInput } from "@/lib/validation";
import { inquirySchema } from "@/lib/validation";

export async function createInquiryAction(
  _prev: ActionState<InquiryInput>,
  formData: FormData,
): Promise<ActionState<InquiryInput>> {
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const body = formData.get("body") as string;

  const validation = inquirySchema.safeParse({ title, category, body });

  if (!validation.success) {
    const fieldErrors: Partial<Record<keyof InquiryInput, string>> = {};
    validation.error.errors.forEach((error) => {
      const field = error.path[0] as keyof InquiryInput;
      fieldErrors[field] = error.message;
    });

    return {
      status: "error",
      fieldErrors,
    };
  }

  try {
    const user = await requireRole("employee");

    await createInquiry({
      ownerId: user.id,
      title: validation.data.title,
      category: validation.data.category,
      body: validation.data.body,
    });

    revalidatePath("/inquiries");
    redirect("/inquiries");
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

    return {
      status: "error",
      formError: "問合せの登録に失敗しました。もう一度お試しください",
    };
  }
}
