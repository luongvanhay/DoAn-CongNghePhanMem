import { useCallback, useEffect, useState } from "react";

const CREATE_STAFF_URL = "/api/auth/admin/create-staff";
const STAFF_LIST_URL = "/api/auth/admin/staff";

export default function StaffAccountManager({ token }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState("");

  const loadStaff = useCallback(async () => {
    if (!token) return;
    setStaffLoading(true);
    setStaffError("");
    try {
      const response = await fetch(STAFF_LIST_URL, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Không tải được danh sách (HTTP ${response.status}).`);
      }
      if (!Array.isArray(data)) throw new Error("Dữ liệu nhân viên không đúng định dạng.");
      setStaff(data);
    } catch (err) {
      setStaffError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setStaffLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const account = username.trim();

    if (!account || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!token) {
      setError("Phiên đăng nhập ADMIN không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(CREATE_STAFF_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: account,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Không thể tạo tài khoản (HTTP ${response.status}).`,
        );
      }

      setMessage(
        `Tạo tài khoản nhân viên "${data.username || account}" thành công.`,
      );
      await loadStaff();
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-page-heading">
      <div style={{ width: "100%", maxWidth: 600 }}>
        <p className="admin-eyebrow">ADMIN STAFF</p>
        <h1>Quản lý nhân viên</h1>
        <p className="admin-subtitle">
          Tạo tài khoản cho nhân viên phụ trách xác nhận thanh toán tiền mặt.
        </p>

        <div className="admin-panel" style={{ marginTop: 24, padding: 20 }}>
          <div className="admin-panel-heading">
            <div>
              <h2>Danh sách nhân viên</h2>
              <p>Các tài khoản có quyền xác nhận thanh toán tiền mặt.</p>
            </div>
            <button type="button" className="admin-refresh" onClick={loadStaff} disabled={staffLoading}>
              {staffLoading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
          {staffError && <p role="alert" className="admin-poi-message error">{staffError}</p>}
          {staffLoading && <p className="admin-poi-empty">Đang tải danh sách nhân viên...</p>}
          {!staffLoading && !staffError && staff.length === 0 && (
            <p className="admin-poi-empty">Chưa có tài khoản nhân viên.</p>
          )}
          {!staffError && staff.length > 0 && (
            <div className="admin-visitor-table-wrap">
              <table className="admin-visitor-table">
                <thead><tr><th>Tên tài khoản</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
                <tbody>{staff.map((account) => (
                  <tr key={account.id || account.username}>
                    <td>{account.username}</td>
                    <td>{account.status === "LOCKED" ? "Đã khóa" : "Đang hoạt động"}</td>
                    <td>{account.createdAt ? new Date(account.createdAt).toLocaleString("vi-VN") : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 24,
            padding: 24,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <label htmlFor="staff-username">Tên tài khoản</label>
            <input
              id="staff-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              disabled={loading}
              required
              style={inputStyle}
              placeholder="Ví dụ: nhanvien01"
            />
          </div>

          <div>
            <label htmlFor="staff-password">Mật khẩu</label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
              required
              style={inputStyle}
              placeholder="Ít nhất 8 ký tự"
            />
          </div>

          <div>
            <label htmlFor="staff-confirm-password">Xác nhận mật khẩu</label>
            <input
              id="staff-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
              style={inputStyle}
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "#dc2626" }}>
              {error}
            </p>
          )}

          {message && (
            <p role="status" style={{ color: "#15803d" }}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} className="admin-refresh">
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản nhân viên"}
          </button>
        </form>
      </div>
    </section>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 15,
};
