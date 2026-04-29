import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  afterEach(() => {
    cleanup();
  });

  it("デフォルトで primary variant を描画する", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-blue-600");
    expect(button.className).toContain("text-white");
  });

  it("secondary variant を描画する", () => {
    render(<Button variant="secondary">Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-gray-200");
    expect(button.className).toContain("text-gray-900");
  });

  it("カスタム className を適用する", () => {
    render(<Button className="custom-class">Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.className).toContain("custom-class");
  });

  it("disabled 状態を描画する", () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-50");
    expect(button.className).toContain("disabled:cursor-not-allowed");
  });

  it("クリックイベントを発火する", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("button の標準属性を渡す", () => {
    render(
      <Button type="submit" form="test-form" aria-label="Submit form">
        Submit
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Submit form" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("form", "test-form");
  });
});
