import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import Analyze from "./pages/Analyze";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Privacy from "./pages/Privacy";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="*" element={<div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Page not found</h1><a className="mt-4 inline-block text-brand-700 underline" href="/">Go home</a></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
