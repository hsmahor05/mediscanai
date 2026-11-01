import ModelMetrics from "../components/ModelMetrics";

const STEPS = [
  ["1. Upload", "You choose a PDF, JPG or PNG. The server checks the file's real signature (not just its name), its size and whether it opens, and rejects empty, unsupported or corrupted files with a clear message."],
  ["2. Text extraction or OCR", "Digital PDFs contain selectable text, which is read directly with PyMuPDF and re-assembled into table rows by position. Scanned PDFs and photos are cleaned with OpenCV (grayscale, upscaling, denoising, thresholding) and read with Tesseract OCR. If OCR is not installed on the server, the app says so and offers manual entry instead of pretending."],
  ["3. Finding laboratory values", "Each line is matched against a catalogue of supported tests and their common aliases (for example SGPT = ALT). The parser then reads the value, an optional comparison sign (such as <0.5), the unit and any reference range printed on the report. Different tests are never treated as interchangeable: fasting, random and 2-hour glucose are separate entries."],
  ["4. Your review", "Anything uncertain is flagged: missing units, implausible numbers, units the test does not normally use, and every OCR-read row. You can correct test type, value, unit and range, then mark rows as verified."],
  ["5. Reference-range comparison", "Range priority: the range printed on your report, otherwise a clearly labelled generic adult range when the unit is confirmed (and sex is given for sex-specific tests). If neither exists the result is 'Unable to determine'. Common unit conversions (for example /cumm to 10^3/uL, mmol/L to mg/dL) are applied and shown."],
  ["6. Machine learning", "A scikit-learn pipeline (median imputation, scaling where needed, classifier) estimates a likelihood pattern for a specific dataset question. It runs only when its inputs are compatible, and otherwise explains why not."],
  ["7. Limitations and appropriate use", "Flags are comparisons of a number with a range, not diagnoses. The ML estimate is an uncalibrated demonstration. Always discuss results with a qualified healthcare professional."],
];
const FLOW = ["File", "Validate", "Text / OCR", "Parse", "Review", "Compare", "ML gate", "Results"];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">How it works</h1>
      <p className="mt-2 text-slate-600">A transparent, step-by-step pipeline. Every stage is implemented in the backend and can be inspected in the source code.</p>

      <div className="card mt-8 overflow-x-auto p-6" role="img" aria-label={`Workflow: ${FLOW.join(" then ")}`}>
        <svg viewBox="0 0 880 90" className="min-w-[760px]" aria-hidden>
          {FLOW.map((f, i) => (
            <g key={f} transform={`translate(${i * 110},10)`}>
              <rect width="94" height="52" rx="12" fill={f === "Review" ? "#d3f8f1" : "#f1f5f9"} stroke="#cbd5e1" />
              <text x="47" y="31" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f1f2e">{f}</text>
              {i < FLOW.length - 1 && <path d={`M96 26 h12`} stroke="#168a84" strokeWidth="2" markerEnd="url(#a)" />}
            </g>
          ))}
          <defs><marker id="a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#168a84" /></marker></defs>
          <text x="440" y="82" textAnchor="middle" fontSize="12" fill="#64748b">The shaded Review step is where a person confirms the data before it is used.</text>
        </svg>
      </div>

      <ol className="mt-8 space-y-4">{STEPS.map(([t, d]) => <li key={t} className="card p-5"><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-slate-600">{d}</p></li>)}</ol>

      <section id="model" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">The machine-learning model and its evaluation</h2>
        <div className="card mt-4 space-y-3 p-6 text-sm text-slate-700">
          <p><strong>Question:</strong> given a 2-hour OGTT plasma glucose, BMI, age and (optionally) diastolic blood pressure, how likely is the patient to belong to the group that was diagnosed with diabetes within 5 years in the training data?</p>
          <p><strong>Why the gate exists:</strong> the dataset's glucose is a 2-hour OGTT value, so a fasting glucose from an ordinary report is a different measurement and is rejected. BMI, age and blood pressure are not on a typical lab report, so the user supplies them. The training population is women of Pima Indian heritage aged 21+, so other profiles are treated as outside the model's scope.</p>
          <p><strong>Workflow:</strong> split first (80/20, stratified, fixed seed); compare logistic regression, decision tree and random forest by 5-fold cross-validation on the training portion; pick by ROC-AUC, preferring the simpler model when scores are within one standard deviation; evaluate once on the untouched test set. Imputation and scaling live inside the pipeline, so they are fitted on training data only (no leakage).</p>
        </div>
        <div className="card mt-4 p-6"><ModelMetrics /></div>
      </section>
    </div>
  );
}
