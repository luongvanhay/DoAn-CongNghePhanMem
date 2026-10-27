import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import PaymentPage from "./pages/Payment/PaymentPage.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/payment" element={<PaymentPage />} />

        <Route path="/admin/*" element={<AdminDashboard />} />

        <Route path="/payments" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
