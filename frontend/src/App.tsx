import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import Agent from "./pages/Agent";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Wizard from "./pages/Wizard";

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<Wizard />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <footer className="border-t border-slate-200 text-center text-slate-500 text-xs py-6 bg-white">
        BidMaster · alat internal · draft → gate → approve manusia
      </footer>
    </BrowserRouter>
  );
}
