import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Menu, X, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/analyze", label: "Analyze Report" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About the Project" },
  { to: "/privacy", label: "Privacy and Safety" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    setOpen(false);
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50); else window.scrollTo(0, 0);
  }, [pathname, hash]);
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Activity className="h-5 w-5" aria-hidden /></span>
            <span className="text-lg">MediScan <span className="text-brand-600">AI</span></span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/analyze" className="btn-primary hidden sm:inline-flex">Analyze My Report <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Mobile" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
              <Link to="/analyze" className="btn-primary mt-2">Analyze My Report</Link>
            </div>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white print:hidden">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-slate-600 md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">MediScan AI</p>
            <p className="mt-2">An educational college engineering project. Not clinically validated; not a medical device.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Privacy notes</p>
            <p className="mt-2">Uploaded files are processed in memory and are not stored by the application. No accounts or tracking.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Explore</p>
            <ul className="mt-2 space-y-1">{NAV.slice(2).map((n) => <li key={n.to}><Link className="hover:text-brand-700 hover:underline" to={n.to}>{n.label}</Link></li>)}</ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
