import { afterEach, vi } from "vitest";
import { ApiError, analyzeManual, getModelInfo } from "./api";

const mockFetch = (impl: () => Promise<unknown>) => vi.stubGlobal("fetch", vi.fn(impl));
const resp = (status: number, body: string) => Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });
afterEach(() => vi.unstubAllGlobals());

describe("api error handling", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch(() => resp(200, JSON.stringify({ available: true })));
    expect(await getModelInfo()).toEqual({ available: true });
  });
  it("maps backend error bodies to ApiError with code and status", async () => {
    mockFetch(() => resp(422, JSON.stringify({ code: "validation_error", message: "Invalid request: tests" })));
    await expect(analyzeManual([], {})).rejects.toMatchObject({ name: "ApiError", code: "validation_error", status: 422, message: "Invalid request: tests" });
  });
  it("handles non-JSON error pages", async () => {
    mockFetch(() => resp(502, "<html>Bad gateway</html>"));
    await expect(getModelInfo()).rejects.toMatchObject({ status: 502, code: "http_error" });
  });
  it("reports unreachable server as network_error", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const err = await getModelInfo().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("network_error");
    expect(err.message).toMatch(/backend/i);
  });
  it("handles malformed success bodies", async () => {
    mockFetch(() => resp(200, "not json"));
    await expect(getModelInfo()).rejects.toMatchObject({ code: "bad_response" });
  });
});
