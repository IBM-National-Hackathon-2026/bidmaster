import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Footer } from "./components/Footer";
import { Nav } from "./components/Nav";
import { Ribbon } from "./components/Ribbon";
import { Toaster } from "./components/ui/toast";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Proposal from "./pages/Proposal";
import Bob from "./pages/Bob";
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
    <div className="app-bg min-h-dvh flex flex-col">
      <Nav />
      <Ribbon />
      <div className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<Proposal />} />
          <Route path="/app/:id" element={<Proposal />} />
          <Route path="/bob" element={<Bob />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="*" element={<Proposal />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Shell />
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
