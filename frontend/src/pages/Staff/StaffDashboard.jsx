import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashPaymentManager from "../Admin/CashPaymentManager.jsx";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [session] = useState(() => ({
    token: localStorage.getItem("token") || "",
    role: (localStorage.getItem("role") || "").toUpperCase(),
    username: localStorage.getItem("username") || "Nhân viên",
  }));

  useEffect(() => {
    if (!session.token || session.role !== "ADMINSTAFF") {
      navigate("/login", { replace: true });
    }
  }, [navigate, session]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }

  if (!session.token || session.role !== "ADMINSTAFF") return null;

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>Quản lý thanh toán tiền mặt</strong>
            <p>Nhân viên: {session.username}</p>
          </div>

          <button type="button" className="admin-refresh" onClick={logout}>
            Đăng xuất
          </button>
        </header>

        <section className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">ADMIN STAFF</p>
            <h1>Xác nhận thanh toán</h1>
            <p className="admin-subtitle">
              Chỉ xử lý các giao dịch thanh toán bằng tiền mặt.
            </p>
          </div>
        </section>

        <CashPaymentManager token={session.token} />
      </main>
    </div>
  );
}
