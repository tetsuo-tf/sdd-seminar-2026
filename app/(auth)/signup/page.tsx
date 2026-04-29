import { AuthForm } from "@/components/auth/AuthForm";
import { signupAction } from "../actions";
import type { SignupInput } from "@/lib/validation";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm<SignupInput>
        title="サインアップ"
        fields={[
          { name: "name", label: "名前", type: "text", required: true },
          {
            name: "email",
            label: "メールアドレス",
            type: "email",
            required: true,
          },
          {
            name: "password",
            label: "パスワード",
            type: "password",
            required: true,
          },
        ]}
        action={signupAction}
        submitText="サインアップ"
        extraFields={
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              ログイン
            </Link>
          </p>
        }
      />
    </div>
  );
}
