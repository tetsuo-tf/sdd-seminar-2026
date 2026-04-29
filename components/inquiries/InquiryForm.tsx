"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { CATEGORY_LABELS } from "@/lib/inquiries/labels";
import { CATEGORY_VALUES } from "@/lib/inquiries/types";
import type { ActionState, InquiryInput } from "@/lib/validation";

interface InquiryFormProps {
  action: (
    prev: ActionState<InquiryInput>,
    formData: FormData,
  ) => Promise<ActionState<InquiryInput>>;
}

export function InquiryForm({ action }: InquiryFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    status: "idle",
  });

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.status === "error" && state.formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {state.formError}
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          maxLength={120}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        <FieldError>
          {state.status === "error" && state.fieldErrors?.title}
        </FieldError>
      </div>

      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        >
          {CATEGORY_VALUES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <FieldError>
          {state.status === "error" && state.fieldErrors?.category}
        </FieldError>
      </div>

      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          本文 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={2000}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        <FieldError>
          {state.status === "error" && state.fieldErrors?.body}
        </FieldError>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "登録中..." : "問合せを登録"}
      </Button>
    </form>
  );
}
