import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NoiseField } from "@/components/signal/NoiseField";

describe("NoiseField", () => {
  it("renderiza decorativo (aria-hidden) com fragmentos de linha", () => {
    const { container } = render(<NoiseField />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });

  it("intensity 'high' tem mais fragmentos que 'low'", () => {
    const low = render(<NoiseField intensity="low" />);
    const high = render(<NoiseField intensity="high" />);
    expect(high.container.querySelectorAll("line").length).toBeGreaterThan(
      low.container.querySelectorAll("line").length,
    );
  });
});
