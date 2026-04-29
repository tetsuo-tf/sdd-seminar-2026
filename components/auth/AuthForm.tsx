"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import type { ActionState } from "@/lib/validation";

interface AuthFormProps<T> {
  title: string;
  fields: Array<{ name: keyof T; label: string; type: string; required?: boolean }>;
  action: (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  submitText: string;
  extraFields?: React.ReactNode;
}

export function AuthForm<T extends Record<string, string>>({
  title,
  fields,
  action,
  submitText,
  extraFields,
}: AuthFormProps<T>) {
  const [state, formAction, isPending] = useActionState(action, { status: "idle" });

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">{title}</h1>
      <form action={formAction} className="space-y-4">
        {state.status === "error" && state.formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {state.formError}
          </div>
        )}

        {fields.map((field) => (
          <div key={String(field.name)}>
            <label htmlFor={String(field.name)} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              id={String(field.name)}
              name={String(field.name)}
              required={field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
            <FieldError>{state.status === "error" && state.fieldErrors?.[field.name]}</FieldError>
          </div>
        ))}

        {extraFields}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "処理中..." : submitText}
        </Button>
      </form>
    </div>
  );
}
