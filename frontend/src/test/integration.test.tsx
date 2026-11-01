/**
 * Frontend <-> backend integration test. Runs the real <App/> against a LIVE backend.
 * Skipped unless INTEGRATION_API is set:
 *   (backend)  CORS_ORIGINS=http://localhost:3000 uvicorn app.main:app --port 8000
 *   (frontend) INTEGRATION_API=1 VITE_API_BASE_URL=http://localhost:8000 npx vitest run src/test/integration.test.tsx
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "../App";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const sample = (name: string) => new File([readFileSync(resolve(__dirname, "../../../samples", name))], name, { type: "application/pdf" });
const go = async () => {
  window.history.pushState({}, "", "/analyze");
  render(<App />);
};

describe.skipIf(!process.env.INTEGRATION_API)("integration with live backend", () => {
  it("uploads a PDF, shows real extracted values, lets the user correct one, and updates the ML estimate", async () => {
    const user = userEvent.setup();
    await go();
    await user.upload(screen.getByTestId("file-input"), sample("sample_report_ogtt.pdf"));
    await user.selectOptions(screen.getByLabelText("Sex"), "female");
    await user.type(screen.getByLabelText(/^Age/), "34");
    await user.type(screen.getByLabelText(/^BMI/), "27.5");
    await user.click(screen.getByRole("button", { name: /start analysis/i }));

    await screen.findByRole("heading", { name: /analysis results/i }, { timeout: 20000 });
    expect(screen.getByText(/Text read directly from a digital PDF/)).toBeInTheDocument();
    const table = screen.getByRole("heading", { name: /laboratory values/i }).closest("section")!;
    expect(within(table).getByText("Glucose (2-hour OGTT)")).toBeInTheDocument();
    expect(within(table).getAllByText("Above range").length).toBe(2);         // real backend comparison (OGTT + HbA1c)
    expect(await screen.findByText("Model estimate available")).toBeInTheDocument();
    const before = Number(screen.getByRole("img", { name: /Model estimate \d+ percent/ }).getAttribute("aria-label")!.match(/\d+/)![0]);
    expect(before).toBeGreaterThan(50);

    // correct a mistake: pretend the OGTT value was misread and is really 90 mg/dL
    await user.click(screen.getByRole("button", { name: /review and correct/i }));
    const rows = await screen.findAllByLabelText(/^Value for row/);
    const idx = rows.findIndex((el) => (el as HTMLInputElement).value === "158");
    expect(idx).toBeGreaterThanOrEqual(0);
    await user.clear(rows[idx]); await user.type(rows[idx], "90");
    await user.click(screen.getByRole("button", { name: /update comparison/i }));
    await waitFor(() => {
      const after = Number(screen.getByRole("img", { name: /Model estimate \d+ percent/ }).getAttribute("aria-label")!.match(/\d+/)![0]);
      expect(after).toBeLessThan(before);
    }, { timeout: 15000 });
  }, 60000);

  it("shows a useful error and retry option for a corrupted PDF", async () => {
    const user = userEvent.setup();
    await go();
    await user.upload(screen.getByTestId("file-input"), new File([new TextEncoder().encode("%PDF-1.4 garbage garbage")], "broken.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: /start analysis/i }));
    const alert = await screen.findByRole("alert", {}, { timeout: 20000 });
    expect(alert).toHaveTextContent(/could not be opened|corrupted/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  }, 40000);

  it("reports an unreachable server clearly", async () => {
    const { getModelInfo } = await import("../services/api");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("fail"))));
    await expect(getModelInfo()).rejects.toMatchObject({ code: "network_error" });
    vi.unstubAllGlobals();
  });
});
