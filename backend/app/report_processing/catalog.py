"""Catalog of supported laboratory tests.

Ranges here are GENERIC adult reference intervals compiled for educational use.
Real ranges vary by laboratory, method, age, sex and units. A range printed on
the user's own report always takes priority over these.
"""
from __future__ import annotations
from dataclasses import dataclass, field

H = "{h}"  # expands to hour|hours|hr|hrs|h


@dataclass(frozen=True)
class TestDef:
    key: str
    name: str
    aliases: tuple[str, ...]
    unit: str                                   # canonical unit
    conversions: dict[str, float] = field(default_factory=dict)  # normalized unit -> factor to canonical
    range_all: tuple[float | None, float | None] | None = None
    range_male: tuple[float | None, float | None] | None = None
    range_female: tuple[float | None, float | None] | None = None
    plausible: tuple[float, float] = (0, 1e9)
    explanation: str = ""


def _t(**kw) -> TestDef:
    return TestDef(**kw)


CATALOG: dict[str, TestDef] = {t.key: t for t in [
    _t(key="hemoglobin", name="Hemoglobin", aliases=("hemoglobin", "haemoglobin", "hb", "hgb"), unit="g/dL",
       range_male=(13.5, 17.5), range_female=(12.0, 15.5), plausible=(2, 25),
       explanation="Hemoglobin is the protein in red blood cells that carries oxygen. Low values are commonly discussed in relation to anemia; high values can relate to hydration, altitude or other causes."),
    _t(key="hematocrit", name="Hematocrit (PCV)", aliases=("hematocrit", "haematocrit", "hct", "pcv", "packed cell volume"), unit="%",
       range_male=(41, 53), range_female=(36, 46), plausible=(10, 70),
       explanation="Hematocrit is the percentage of your blood volume made up of red blood cells."),
    _t(key="rbc", name="Red Blood Cell count", aliases=("rbc", "rbc count", "red blood cell count", "red blood cells", "total rbc count", "erythrocyte count"), unit="10^6/uL",
       conversions={"10^12/l": 1.0, "m/ul": 1.0, "million/cumm": 1.0, "mill/cumm": 1.0, "million/ul": 1.0},
       range_male=(4.5, 5.9), range_female=(4.1, 5.1), plausible=(1, 9),
       explanation="The number of red blood cells per volume of blood. It is interpreted together with hemoglobin and hematocrit."),
    _t(key="wbc", name="White Blood Cell count", aliases=("wbc", "wbc count", "total wbc count", "white blood cell count", "white blood cells", "total leucocyte count", "total leukocyte count", "tlc", "leukocyte count", "leucocyte count"), unit="10^3/uL",
       conversions={"/cumm": 0.001, "cells/cumm": 0.001, "/mm3": 0.001, "cells/mm3": 0.001, "/ul": 0.001, "cells/ul": 0.001,
                    "10^9/l": 1.0, "k/ul": 1.0, "thou/ul": 1.0, "thou/mm3": 1.0},
       range_all=(4.0, 11.0), plausible=(0.1, 500),
       explanation="White blood cells are part of the immune system. Counts outside the usual range can be associated with infection, inflammation, medications and many other factors."),
    _t(key="platelets", name="Platelet count", aliases=("platelet count", "platelets", "plt", "platelet"), unit="10^3/uL",
       conversions={"/cumm": 0.001, "cells/cumm": 0.001, "/mm3": 0.001, "/ul": 0.001, "lakhs/cumm": 100.0, "lakh/cumm": 100.0, "lakhs/ul": 100.0,
                    "10^9/l": 1.0, "k/ul": 1.0, "thou/ul": 1.0, "thou/mm3": 1.0},
       range_all=(150, 450), plausible=(1, 2000),
       explanation="Platelets help blood to clot. Both low and high counts have many possible causes that need clinical context."),
    _t(key="mcv", name="Mean Corpuscular Volume (MCV)", aliases=("mcv", "mean corpuscular volume"), unit="fL", range_all=(80, 100), plausible=(40, 150),
       explanation="MCV estimates the average size of your red blood cells and helps classify types of anemia."),
    _t(key="glucose_fasting", name="Glucose (fasting)", aliases=("fasting blood sugar", "fasting glucose", "glucose fasting", "fasting plasma glucose", "fasting blood glucose", "fbs", "fbg", "fpg", "glucose f"), unit="mg/dL",
       conversions={"mmol/l": 18.016}, range_all=(70, 99), plausible=(20, 800),
       explanation="Fasting glucose measures blood sugar after at least 8 hours without food. Results above the usual range are one of several measures clinicians use when assessing blood-sugar regulation."),
    _t(key="glucose_ogtt_2h", name="Glucose (2-hour OGTT)", aliases=(
        f"glucose 2 {H} ogtt", f"glucose ogtt 2 {H}", f"ogtt 2 {H}", f"2 {H} ogtt", f"glucose 2 {H}", f"2 {H} glucose", f"2 {H} plasma glucose",
        f"2 {H} post load glucose", f"2 {H} post glucose load", "post load glucose", "glucose post load", f"glucose tolerance test 2 {H}", f"glucose tolerance 2 {H}"), unit="mg/dL",
       conversions={"mmol/l": 18.016}, range_all=(None, 140), plausible=(20, 800),
       explanation="The 2-hour value from an oral glucose tolerance test (OGTT), taken two hours after a standard glucose drink. This is a different measurement from a fasting or random glucose."),
    _t(key="glucose_random", name="Glucose (random / post-prandial)", aliases=("random blood sugar", "random glucose", "glucose random", "rbs", "post prandial blood sugar", "postprandial glucose", "post prandial glucose", "ppbs", "pp blood sugar", "glucose pp", "glucose post prandial"), unit="mg/dL",
       conversions={"mmol/l": 18.016}, plausible=(20, 800),
       explanation="A glucose measured at an unspecified or post-meal time. Its interpretation depends on the timing relative to eating, so no generic range is applied unless your report prints one."),
    _t(key="glucose_unspecified", name="Glucose (type not specified)", aliases=("blood glucose", "plasma glucose", "blood sugar", "glucose"), unit="mg/dL",
       conversions={"mmol/l": 18.016}, plausible=(20, 800),
       explanation="The report does not say whether this glucose was fasting, random or post-load. Please choose the correct type in the review table so a suitable range can be applied."),
    _t(key="hba1c", name="HbA1c", aliases=("hba1c", "hbalc", "hb alc", "glycated hemoglobin", "glycosylated hemoglobin", "glycohemoglobin", "a1c", "hb a1c"), unit="%",
       range_all=(None, 5.7), plausible=(2, 20),
       explanation="HbA1c reflects average blood glucose over roughly the previous 2-3 months."),
    _t(key="total_cholesterol", name="Total Cholesterol", aliases=("total cholesterol", "cholesterol total", "serum cholesterol", "cholesterol"), unit="mg/dL",
       conversions={"mmol/l": 38.67}, range_all=(None, 200), plausible=(50, 600),
       explanation="Total cholesterol is the sum of cholesterol carried by different lipoproteins. It is usually interpreted alongside LDL, HDL and triglycerides."),
    _t(key="ldl", name="LDL Cholesterol", aliases=("ldl cholesterol", "ldl", "ldl-c", "ldl c", "low density lipoprotein"), unit="mg/dL",
       conversions={"mmol/l": 38.67}, range_all=(None, 100), plausible=(10, 500),
       explanation="LDL is often called 'bad' cholesterol because higher levels are associated with cardiovascular risk. Target levels depend on individual risk."),
    _t(key="hdl", name="HDL Cholesterol", aliases=("hdl cholesterol", "hdl", "hdl-c", "hdl c", "high density lipoprotein"), unit="mg/dL",
       conversions={"mmol/l": 38.67}, range_male=(40, None), range_female=(50, None), plausible=(5, 200),
       explanation="HDL is often called 'good' cholesterol; higher levels are generally considered favourable."),
    _t(key="triglycerides", name="Triglycerides", aliases=("triglycerides", "triglyceride", "tg", "serum triglycerides"), unit="mg/dL",
       conversions={"mmol/l": 88.57}, range_all=(None, 150), plausible=(10, 3000),
       explanation="Triglycerides are a type of fat in the blood. Levels are affected by recent meals, alcohol and other factors."),
    _t(key="creatinine", name="Serum Creatinine", aliases=("serum creatinine", "creatinine"), unit="mg/dL",
       conversions={"umol/l": 0.01131}, range_male=(0.74, 1.35), range_female=(0.59, 1.04), plausible=(0.1, 20),
       explanation="Creatinine is a waste product filtered by the kidneys and is used to estimate kidney function."),
    _t(key="bun", name="Blood Urea Nitrogen (BUN)", aliases=("blood urea nitrogen", "bun"), unit="mg/dL", range_all=(7, 20), plausible=(1, 200),
       explanation="BUN reflects urea, a waste product made in the liver and removed by the kidneys. Hydration and diet also affect it."),
    _t(key="alt", name="ALT (SGPT)", aliases=("alanine aminotransferase", "alanine transaminase", "alt", "sgpt", "alt sgpt", "sgpt alt"), unit="U/L",
       conversions={"iu/l": 1.0}, range_all=(7, 55), plausible=(1, 5000),
       explanation="ALT is an enzyme found mainly in the liver. Raised values can indicate liver cell irritation or injury but are not specific to one cause."),
    _t(key="ast", name="AST (SGOT)", aliases=("aspartate aminotransferase", "aspartate transaminase", "ast", "sgot", "ast sgot", "sgot ast"), unit="U/L",
       conversions={"iu/l": 1.0}, range_all=(8, 48), plausible=(1, 5000),
       explanation="AST is an enzyme found in the liver, heart and muscle. It is interpreted together with ALT and other tests."),
    _t(key="tsh", name="TSH", aliases=("thyroid stimulating hormone", "tsh"), unit="mIU/L",
       conversions={"uiu/ml": 1.0, "miu/ml": 1000.0}, range_all=(0.4, 4.0), plausible=(0.001, 200),
       explanation="TSH is made by the pituitary gland and regulates the thyroid. It is a common first test of thyroid function."),
    _t(key="sodium", name="Sodium", aliases=("serum sodium", "sodium", "na+", "na"), unit="mmol/L", conversions={"meq/l": 1.0}, range_all=(135, 145), plausible=(90, 180),
       explanation="Sodium is an electrolyte that helps regulate fluid balance."),
    _t(key="potassium", name="Potassium", aliases=("serum potassium", "potassium", "k+"), unit="mmol/L", conversions={"meq/l": 1.0}, range_all=(3.5, 5.1), plausible=(1.5, 9),
       explanation="Potassium is an electrolyte important for nerve and muscle (including heart) function."),
    _t(key="calcium", name="Calcium", aliases=("serum calcium", "total calcium", "calcium"), unit="mg/dL", conversions={"mmol/l": 4.008}, range_all=(8.6, 10.2), plausible=(4, 20),
       explanation="Calcium is important for bones, nerves and muscles."),
    _t(key="vitamin_d", name="Vitamin D (25-OH)", aliases=("25 hydroxy vitamin d", "25-oh vitamin d", "25 oh vitamin d", "vitamin d 25 hydroxy", "vitamin d total", "vitamin d", "25-hydroxyvitamin d"), unit="ng/mL",
       conversions={"nmol/l": 0.4006}, range_all=(30, 100), plausible=(1, 300),
       explanation="Vitamin D supports bone health. Reference cut-offs differ between laboratories and guidelines."),
]}


def range_for(t: TestDef, sex: str | None) -> tuple[tuple[float | None, float | None] | None, str | None]:
    """Return (range, reason_if_unavailable)."""
    if t.range_all is not None:
        return t.range_all, None
    if t.range_male or t.range_female:
        if sex == "male" and t.range_male: return t.range_male, None
        if sex == "female" and t.range_female: return t.range_female, None
        return None, "This range depends on sex; select sex in the details form or use the range printed on your report."
    return None, "No generic reference range is applied for this test; use the range printed on your report."
