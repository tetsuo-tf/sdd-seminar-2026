import { AuthForm } from "@/components/auth/AuthForm";
import { loginAction } from "../actions";
import type { LoginInput } from "@/lib/validation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm<LoginInput>
        title="ログイン"
        fields={[
          { name: "email", label: "メールアドレス", type: "email", required: true },
          { name: "password", label: "パスワード", type: "password", required: true },
        ]}
        action={loginAction}
        submitText="ログイン"
        extraFields={
          <p className="text-sm text-gray-600">
            アカウントをお持ちでないですか？{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-700">
              サインアップ
            </Link>
          </p>
        }
      />
    </div>
  );
}
