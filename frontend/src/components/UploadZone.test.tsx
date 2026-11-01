import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import UploadZone from "./UploadZone";

function Harness() {
  const [file, setFile] = useState<File | null>(null);
  return <UploadZone file={file} onFile={setFile} />;
}
const pick = (name: string, type: string, size = 100) => new File([new Uint8Array(size)], name, { type });

describe("UploadZone", () => {
  it("shows file name and size for a valid file and allows removal", async () => {
    render(<Harness />);
    await userEvent.upload(screen.getByTestId("file-input"), pick("report.pdf", "application/pdf", 2048));
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /remove file/i }));
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });
  it("shows a clear error for an unsupported file", () => {
    render(<Harness />);
    fireEvent.change(screen.getByTestId("file-input"), { target: { files: [pick("notes.txt", "text/plain")] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported file type/i);
    expect(screen.queryByTestId("selected-file")).not.toBeInTheDocument();
  });
  it("shows an error for an empty file", () => {
    render(<Harness />);
    fireEvent.change(screen.getByTestId("file-input"), { target: { files: [pick("a.pdf", "application/pdf", 0)] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/empty/i);
  });
  it("accepts a dropped file", () => {
    render(<Harness />);
    const zone = screen.getByText(/drag and drop/i).closest("div")!;
    fireEvent.drop(zone, { dataTransfer: { files: [pick("scan.png", "image/png")] } });
    expect(screen.getByText("scan.png")).toBeInTheDocument();
  });
});
