import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignalDivider } from "@/components/signal/SignalDivider";

describe("SignalDivider", () => {
  it("renderiza um separator", () => {
    render(<SignalDivider />);
    expect(screen.getByRole("separator", { hidden: true })).toBeInTheDocument();
  });
});
