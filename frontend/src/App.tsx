import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth";
import { Nav } from "./components/Nav";
import { Ribbon } from "./components/Ribbon";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Proposal from "./pages/Proposal";
import Riwayat from "./pages/Riwayat";

function Shell() {
  const loc = useLocation();
  if (loc.pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    );
  }
  return (
    <>
      <Nav />
      <Ribbon />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<Proposal />} />
        <Route path="/app/:id" element={<Proposal />} />
        <Route path="/riwayat" element={<Riwayat />} />
        <Route path="*" element={<Proposal />} />
      </Routes>
      <footer className="border-t border-slate-200 text-center text-slate-600 text-xs py-6 bg-white">
        BidMaster AI · alat internal · draft → gate → approve manusia
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
