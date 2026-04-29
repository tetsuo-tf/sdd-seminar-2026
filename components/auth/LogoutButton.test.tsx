import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

const signOutMock = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: (...args: unknown[]) => signOutMock(...args),
  },
}));

describe("LogoutButton", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: "http://localhost/" },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("「ログアウト」ラベルの secondary ボタンを描画する", () => {
    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: "ログアウト" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-gray-200");
  });

  it("クリックで signOut を呼び出し /login に遷移する", async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login");
  });

  it("signOut 完了後にリダイレクトする(順序保証)", async () => {
    const order: string[] = [];
    signOutMock.mockImplementation(async () => {
      order.push("signOut");
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        set href(value: string) {
          order.push(`href:${value}`);
        },
        get href() {
          return "";
        },
      },
    });

    const user = userEvent.setup();
    render(<LogoutButton />);
    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(order).toEqual(["signOut", "href:/login"]);
  });
});
