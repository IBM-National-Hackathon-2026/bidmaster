import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { Nav } from "./components/Nav";
import { Ribbon } from "./components/Ribbon";
import Login from "./pages/Login";
import Proposal from "./pages/Proposal";
import Riwayat from "./pages/Riwayat";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Ribbon />
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Proposal />} />
          <Route path="/app/:id" element={<Proposal />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
        <footer className="border-t border-slate-200 text-center text-slate-600 text-xs py-6 bg-white">
          BidMaster AI · alat internal · draft → gate → approve manusia
        </footer>
      </AuthProvider>
    </BrowserRouter>
  );
}
