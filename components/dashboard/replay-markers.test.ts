import { describe, it, expect } from "vitest";
import { momentMarkers } from "@/components/dashboard/replay-markers";

const series = [
  { t: 0, attention: 40, meditation: 50 },
  { t: 8, attention: 70, meditation: 50 },
  { t: 21, attention: 20, meditation: 50 },
  { t: 27, attention: null, meditation: 50 },
  { t: 28, attention: 75, meditation: 50 },
];

describe("momentMarkers", () => {
  it("numera os momentos e usa o attention do segundo (ou o vizinho mais próximo com valor)", () => {
    expect(
      momentMarkers(series, [
        { kind: "streak", t: 8, tEnd: 17, value: 10 },
        { kind: "drop", t: 21, value: -50 },
        { kind: "rise", t: 27, value: 55 },
      ]),
    ).toEqual({
      dots: [
        { x: 8, y: 70, label: "①" },
        { x: 21, y: 20, label: "②" },
        { x: 27, y: 75, label: "③" },
      ],
      area: { x1: 8, x2: 17 },
    });
  });

  it("sem momentos → nada", () => {
    expect(momentMarkers(series, [])).toEqual({ dots: [], area: null });
  });
});
