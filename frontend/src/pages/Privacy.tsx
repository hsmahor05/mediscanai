import Disclaimer from "../components/Disclaimer";

const ITEMS = [
  ["What happens to your file", "Your report is sent to the backend, processed in memory, and discarded when the response is returned. The application does not write uploads to disk or a database."],
  ["What is logged", "Server logs record only technical facts such as file kind and the number of tests found. They do not contain report text, names or values."],
  ["Accounts and tracking", "There are no accounts, cookies for tracking, or analytics in this project."],
  ["Optional details", "Sex, age, BMI and blood pressure are sent with your request only so the backend can apply sex-specific ranges and the ML demo. They are not stored."],
  ["Hosting", "If you use a hosted copy, your data travels to that host's servers over HTTPS. Free hosting is shared infrastructure, so avoid uploading real records you are not comfortable sharing; use the provided synthetic samples for demonstrations."],
  ["Compliance", "This project does not claim compliance with any medical-data regulation (such as HIPAA or GDPR) and has not been independently assessed."],
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy and safety</h1>
      <Disclaimer />
      <section className="card p-6"><h2 className="text-lg font-bold">How to read the results safely</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>"Below / within / above range" only compares a number with a range. It does not say whether you are healthy or unwell.</li>
          <li>Extracted values may be wrong. Always compare them with your original report.</li>
          <li>The ML output is an experimental estimate for one specific dataset question. It is not a diagnosis or a clinical probability.</li>
          <li>If you are worried about a result or have symptoms, contact a qualified healthcare professional. In an emergency, contact your local emergency number.</li>
        </ul></section>
      {ITEMS.map(([t, d]) => <section key={t} className="card p-6"><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-slate-600">{d}</p></section>)}
    </div>
  );
}
