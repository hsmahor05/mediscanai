import { validateFile, formatSize } from "./validateFile";

const f = (name: string, size: number, type: string) => new File([new Uint8Array(size)], name, { type });

describe("validateFile", () => {
  it("accepts pdf, jpg, jpeg and png", () => {
    expect(validateFile(f("a.pdf", 10, "application/pdf"))).toBeNull();
    expect(validateFile(f("a.JPG", 10, "image/jpeg"))).toBeNull();
    expect(validateFile(f("a.png", 10, "image/png"))).toBeNull();
  });
  it("rejects empty files", () => expect(validateFile(f("a.pdf", 0, "application/pdf"))).toMatch(/empty/i));
  it("rejects unsupported types by extension and by mime", () => {
    expect(validateFile(f("a.docx", 10, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toMatch(/unsupported/i);
    expect(validateFile(f("a.pdf", 10, "text/plain"))).toMatch(/unsupported/i);
  });
  it("rejects oversized files", () => expect(validateFile(f("a.pdf", 11 * 1024 * 1024, "application/pdf"))).toMatch(/limit/i));
  it("formats sizes", () => { expect(formatSize(512)).toBe("512 B"); expect(formatSize(2048)).toBe("2 KB"); expect(formatSize(3 * 1024 * 1024)).toBe("3.0 MB"); });
});
