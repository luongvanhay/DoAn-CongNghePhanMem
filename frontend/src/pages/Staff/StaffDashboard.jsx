import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CashPaymentManager from "../Admin/CashPaymentManager.jsx";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("token") || "";
    const role = (localStorage.getItem("role") || "").toUpperCase();

    if (!savedToken || role !== "ADMINSTAFF") {
      navigate("/login", { replace: true });
      return;
    }

    setToken(savedToken);
    setUsername(localStorage.getItem("username") || "Nhân viên");
  }, [navigate]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }

  if (!token) return null;

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>Quản lý thanh toán tiền mặt</strong>
            <p>Nhân viên: {username}</p>
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

        <CashPaymentManager token={token} />
      </main>
    </div>
  );
}
