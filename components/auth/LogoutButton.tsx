"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return <Button onClick={handleLogout} variant="secondary">ログアウト</Button>;
}
