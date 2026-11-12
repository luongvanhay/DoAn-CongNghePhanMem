import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import PaymentPage from "./pages/Payment/PaymentPage.jsx";
import PoiOwnerRegister from "./pages/PoiOwer/PoiOwnerRegister.jsx";
import LoginPage from "./pages/Auth/LoginPage.jsx";
import PoiOwnerDashboard from "./pages/PoiOwer/PoiOwnerDashboard.jsx";
import StaffDashboard from "./pages/Staff/StaffDashboard.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/poi-owner/register" element={<PoiOwnerRegister />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/payments" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/poi-owner/dashboard" element={<PoiOwnerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
