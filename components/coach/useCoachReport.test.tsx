import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("@/lib/coach/action", () => ({ getCoachReportAction: mocks.action }));

import { useCoachReport } from "@/components/coach/useCoachReport";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.action.mockImplementation(async (id: string) => ({ ok: false, reason: id === "a" ? "not_found" : "error" }));
});

describe("useCoachReport", () => {
  it("busca 1 vez por corrida e reaproveita ao voltar", async () => {
    const { result, rerender } = renderHook(({ id }) => useCoachReport(id), {
      initialProps: { id: "a" as string | undefined },
    });
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "not_found" }));
    rerender({ id: "b" });
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "error" }));
    rerender({ id: "a" });
    expect(result.current.result).toEqual({ ok: false, reason: "not_found" });
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });

  it("exceção na action vira reason error", async () => {
    mocks.action.mockRejectedValue(new Error("rede"));
    const { result } = renderHook(() => useCoachReport("z"));
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "error" }));
  });

  it("retry busca de novo depois de um erro", async () => {
    mocks.action.mockResolvedValueOnce({ ok: false, reason: "error" }).mockResolvedValueOnce({ ok: false, reason: "not_found" });
    const { result } = renderHook(() => useCoachReport("z"));
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "error" }));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "not_found" }));
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });

  it("A→B→A rápido não repete a chamada da corrida ainda em voo", async () => {
    const resolvers: Record<string, (v: unknown) => void> = {};
    mocks.action.mockImplementation((id: string) => new Promise((res) => (resolvers[id] = res)));
    const { result, rerender } = renderHook(({ id }) => useCoachReport(id), {
      initialProps: { id: "a" as string | undefined },
    });
    rerender({ id: "b" });
    rerender({ id: "a" });
    await act(async () => {
      resolvers.a({ ok: false, reason: "not_found" });
      resolvers.b({ ok: false, reason: "error" });
    });
    await waitFor(() => expect(result.current.result).toEqual({ ok: false, reason: "not_found" }));
    expect(mocks.action).toHaveBeenCalledTimes(2);
  });

  it("sem corrida selecionada → null, sem chamar", () => {
    const { result } = renderHook(() => useCoachReport(undefined));
    expect(result.current.result).toBeNull();
    expect(mocks.action).not.toHaveBeenCalled();
  });
});
