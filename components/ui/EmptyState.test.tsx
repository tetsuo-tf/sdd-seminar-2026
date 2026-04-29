import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  afterEach(() => {
    cleanup();
  });

  it("title を描画する", () => {
    render(<EmptyState title="No items found" />);

    const title = screen.getByText("No items found");
    expect(title).toBeInTheDocument();
    expect(title.className).toContain("text-lg");
    expect(title.className).toContain("font-medium");
  });

  it("description を描画する", () => {
    render(
      <EmptyState title="No items" description="Try adjusting your filters" />,
    );

    const title = screen.getByText("No items");
    const description = screen.getByText("Try adjusting your filters");
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(description.className).toContain("text-sm");
    expect(description.className).toContain("text-gray-600");
  });

  it("description なしで描画する", () => {
    render(<EmptyState title="No items" />);

    const title = screen.getByText("No items");
    expect(title).toBeInTheDocument();
    expect(screen.queryByText(/Try adjusting/)).not.toBeInTheDocument();
  });

  it("action を描画する", () => {
    render(
      <EmptyState
        title="No items"
        action={<button type="button">Add item</button>}
      />,
    );

    const action = screen.getByRole("button", { name: "Add item" });
    expect(action).toBeInTheDocument();
  });

  it("action なしで描画する", () => {
    render(<EmptyState title="No items" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("全ての props を含めて描画する", () => {
    render(
      <EmptyState
        title="No results"
        description="We couldn't find any matching items"
        action={<button type="button">Clear filters</button>}
      />,
    );

    const title = screen.getByText("No results");
    const description = screen.getByText("We couldn't find any matching items");
    const action = screen.getByRole("button", { name: "Clear filters" });

    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(action).toBeInTheDocument();
  });
});
