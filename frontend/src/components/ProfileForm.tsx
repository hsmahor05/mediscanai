import type { Profile } from "../types/api";

interface Props { profile: Profile; onChange: (p: Profile) => void; }
const num = (v: string) => (v === "" ? null : Number(v));

export default function ProfileForm({ profile, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="label" htmlFor="sex">Sex</label>
        <select id="sex" className="input" value={profile.sex ?? ""} onChange={(e) => onChange({ ...profile, sex: (e.target.value || null) as Profile["sex"] })}>
          <option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="age">Age (years)</label>
        <input id="age" className="input" type="number" min={0} max={120} value={profile.age ?? ""} onChange={(e) => onChange({ ...profile, age: num(e.target.value) })} />
      </div>
      <div>
        <label className="label" htmlFor="bmi">BMI (kg/m²)</label>
        <input id="bmi" className="input" type="number" step="0.1" min={5} max={100} value={profile.bmi ?? ""} onChange={(e) => onChange({ ...profile, bmi: num(e.target.value) })} />
      </div>
      <div>
        <label className="label" htmlFor="bp">Diastolic BP (mmHg, optional)</label>
        <input id="bp" className="input" type="number" min={30} max={150} value={profile.diastolic_bp ?? ""} onChange={(e) => onChange({ ...profile, diastolic_bp: num(e.target.value) })} />
      </div>
    </div>
  );
}
