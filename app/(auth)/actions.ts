"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ActionState, LoginInput, SignupInput } from "@/lib/validation";
import { loginSchema, signupSchema } from "@/lib/validation";

export async function signupAction(
  _prev: ActionState<SignupInput>,
  formData: FormData,
): Promise<ActionState<SignupInput>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const validation = signupSchema.safeParse({ email, password, name });

  if (!validation.success) {
    const fieldErrors: Partial<Record<keyof SignupInput, string>> = {};
    validation.error.errors.forEach((error) => {
      const field = error.path[0] as keyof SignupInput;
      fieldErrors[field] = error.message;
    });

    return {
      status: "error",
      fieldErrors,
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: validation.data.email,
        password: validation.data.password,
        name: validation.data.name,
      },
    });

    // Get the session after signup to determine redirect
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return {
        status: "error",
        formError: "サインアップに失敗しました",
      };
    }

    // Redirect based on role
    const role = session.user.role as "employee" | "it-staff";
    if (role === "it-staff") {
      redirect("/admin/inquiries");
    } else {
      redirect("/inquiries");
    }
  } catch (error) {
    // Handle Better Auth errors
    if (error instanceof Error) {
      if (error.message.includes("USER_ALREADY_EXISTS")) {
        return {
          status: "error",
          fieldErrors: {
            email: "このメールアドレスは既に登録されています",
          },
        };
      }
    }

    return {
      status: "error",
      formError: "サインアップに失敗しました。もう一度お試しください",
    };
  }
}

export async function loginAction(
  _prev: ActionState<LoginInput>,
  formData: FormData,
): Promise<ActionState<LoginInput>> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = loginSchema.safeParse({ email, password });

  if (!validation.success) {
    const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
    validation.error.errors.forEach((error) => {
      const field = error.path[0] as keyof LoginInput;
      fieldErrors[field] = error.message;
    });

    return {
      status: "error",
      fieldErrors,
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: validation.data.email,
        password: validation.data.password,
      },
    });

    // Get the session after login to determine redirect
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return {
        status: "error",
        formError: "ログインに失敗しました",
      };
    }

    // Redirect based on role
    const role = session.user.role as "employee" | "it-staff";
    if (role === "it-staff") {
      redirect("/admin/inquiries");
    } else {
      redirect("/inquiries");
    }
  } catch {
    // Generic error message for security (don't reveal if email exists)
    return {
      status: "error",
      formError: "メールアドレスまたはパスワードが正しくありません",
    };
  }
}

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/login");
}
