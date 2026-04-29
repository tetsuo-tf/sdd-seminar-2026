"use client";

import { Button } from "@/components/ui/Button";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <Button onClick={handleLogout} variant="secondary">
      ログアウト
    </Button>
  );
}
