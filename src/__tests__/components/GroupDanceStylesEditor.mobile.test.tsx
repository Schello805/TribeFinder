import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import GroupDanceStylesEditor from "@/components/groups/GroupDanceStylesEditor";

describe("GroupDanceStylesEditor mobile regression", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not refetch dance styles on select focus (prevents mobile picker closing)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.startsWith("/api/dance-styles")) {
        return new Response(
          JSON.stringify({
            available: [
              { id: "ds1", name: "Tribal Fusion", category: null, aliases: [] },
              { id: "ds2", name: "FCBD Style", category: null, aliases: [] },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    render(<GroupDanceStylesEditor value={[]} onChange={vi.fn()} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0));

    const callsAfterInitialLoad = fetchMock.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : c[0]?.toString();
      return typeof u === "string" && u.startsWith("/api/dance-styles");
    });
    expect(callsAfterInitialLoad.length).toBe(1);

    const selects = screen.getAllByRole("combobox");
    const danceStyleSelect = selects[0];
    fireEvent.focus(danceStyleSelect);

    const callsAfterFocus = fetchMock.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : c[0]?.toString();
      return typeof u === "string" && u.startsWith("/api/dance-styles");
    });
    expect(callsAfterFocus.length).toBe(1);
  });
});
