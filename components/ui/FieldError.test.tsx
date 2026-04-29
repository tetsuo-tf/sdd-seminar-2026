import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FieldError } from "./FieldError";

describe("FieldError", () => {
  afterEach(() => {
    cleanup();
  });

  it("children がある場合にエラーメッセージを描画する", () => {
    render(<FieldError>This field is required</FieldError>);

    const error = screen.getByText("This field is required");
    expect(error).toBeInTheDocument();
    expect(error.tagName).toBe("P");
    expect(error.className).toContain("text-sm");
    expect(error.className).toContain("text-red-600");
  });

  it("children がない場合に null を返す", () => {
    const { container } = render(<FieldError />);

    expect(container.firstChild).toBeNull();
  });

  it("空文字列の場合に null を返す", () => {
    const { container } = render(<FieldError>{""}</FieldError>);

    expect(container.firstChild).toBeNull();
  });

  it("複雑な children を描画する", () => {
    render(
      <FieldError>
        <span>Error: </span>
        <strong>Invalid input</strong>
      </FieldError>,
    );

    const error = screen.getByText(/Error:/);
    const strong = screen.getByText("Invalid input");
    expect(error).toBeInTheDocument();
    expect(strong).toBeInTheDocument();
  });
});
