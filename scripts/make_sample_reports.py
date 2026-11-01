"""Generate SYNTHETIC demonstration lab reports (PDF + PNG). No real patient data.
Usage: python scripts/make_sample_reports.py
"""
from pathlib import Path
import pymupdf
from PIL import Image
import io

OUT = Path(__file__).resolve().parent.parent / "samples"
HEADER = ["SYNTHETIC DEMONSTRATION REPORT - NOT REAL PATIENT DATA", "City Demo Pathology Lab (fictional)", "Patient: Demo Patient   Age/Sex: 34 / F   Sample: Serum"]
COLS = [("Test", 40), ("Result", 230), ("Unit", 300), ("Reference Range", 380)]

REPORTS = {
    "sample_report_general.pdf": [
        ("Hemoglobin", "11.2", "g/dL", "12.0 - 15.5"),
        ("WBC Count", "7800", "/cumm", "4000 - 11000"),
        ("Platelet Count", "2.6", "lakhs/cumm", "1.5 - 4.5"),
        ("Fasting Blood Sugar", "112", "mg/dL", "70 - 99"),
        ("HbA1c", "5.4", "%", "< 5.7"),
        ("Total Cholesterol", "224", "mg/dL", "< 200"),
        ("HDL Cholesterol", "52", "mg/dL", "> 50"),
        ("LDL Cholesterol", "138", "mg/dL", "< 100"),
        ("Triglycerides", "148", "mg/dL", "< 150"),
        ("Serum Creatinine", "0.8", "mg/dL", "0.59 - 1.04"),
        ("TSH", "2.1", "mIU/L", "0.4 - 4.0"),
        ("SGPT (ALT)", "26", "U/L", "7 - 55"),
    ],
    "sample_report_ogtt.pdf": [
        ("Fasting Blood Sugar", "98", "mg/dL", "70 - 99"),
        ("Glucose 2 hr (OGTT)", "158", "mg/dL", "< 140"),
        ("HbA1c", "5.9", "%", "< 5.7"),
        ("Hemoglobin", "12.8", "g/dL", "12.0 - 15.5"),
    ],
}


def make_pdf(path: Path, rows):
    doc = pymupdf.open(); page = doc.new_page()
    y = 50
    for i, h in enumerate(HEADER):
        page.insert_text((40, y), h, fontsize=11 if i else 12, fontname="helv"); y += 18
    y += 14
    for name, x in COLS:
        page.insert_text((x, y), name, fontsize=10, fontname="hebo")
    y += 20
    for r in rows:
        for (_, x), cell in zip(COLS, r):
            page.insert_text((x, y), cell, fontsize=10, fontname="helv")
        y += 20
    doc.save(path); return doc


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for fname, rows in REPORTS.items():
        make_pdf(OUT / fname, rows)
    # Image version of the OGTT report (rendered large for OCR)
    d = pymupdf.open(OUT / "sample_report_ogtt.pdf")
    d[0].get_pixmap(dpi=200).save(OUT / "sample_report_ogtt.png")
    print("Created:", sorted(p.name for p in OUT.iterdir()))
