import { useCallback, useEffect, useState } from "react";

const CREATE_STAFF_URL = "/api/auth/admin/create-staff";
const STAFF_LIST_URL = "/api/auth/admin/users";
const STAFF_URL = "/api/auth/admin/users";

function getRoleLabel(role) {
  return {
    ADMINSTAFF: "Nhân viên",
    PROVIDER: "Chủ địa điểm",
    VISITOR: "Khách tham quan",
  }[role] || "Người dùng";
}

export default function UserAccountManager({ token }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [staffActionId, setStaffActionId] = useState("");

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
      if (!Array.isArray(data)) throw new Error("Dữ liệu người dùng không đúng định dạng.");
      setStaff(data);
    } catch (err) {
      setStaffError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setStaffLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStaff();
    }, 0);
    return () => window.clearTimeout(timerId);
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

  function startEditing(account) {
    setEditingId(account.id);
    setEditUsername(account.username);
    setEditPassword("");
    setError("");
    setMessage("");
  }

  async function saveStaff(account) {
    setError("");
    setMessage("");
    if (!editUsername.trim()) {
      setError("Tên tài khoản không được để trống.");
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    setStaffActionId(account.id);
    try {
      const response = await fetch(`${STAFF_URL}/${encodeURIComponent(account.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: editUsername.trim(), password: editPassword || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Không thể cập nhật tài khoản (HTTP ${response.status}).`);
      setMessage(`Đã cập nhật tài khoản "${data.username || editUsername.trim()}".`);
      setEditingId("");
      setEditPassword("");
      await loadStaff();
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setStaffActionId("");
    }
  }

  async function toggleStaffStatus(account) {
    const nextStatus = account.status === "LOCKED" ? "ACTIVE" : "LOCKED";
    const action = nextStatus === "LOCKED" ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản "${account.username}"?`)) return;

    setError("");
    setMessage("");
    setStaffActionId(account.id);
    try {
      const response = await fetch(`${STAFF_URL}/${encodeURIComponent(account.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Không thể ${action} tài khoản (HTTP ${response.status}).`);
      setMessage(`Đã ${action} tài khoản "${data.username || account.username}".`);
      await loadStaff();
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ.");
    } finally {
      setStaffActionId("");
    }
  }

  return (
    <section className="admin-page-heading">
      <div style={{ width: "100%", maxWidth: 1100 }}>
        <p className="admin-eyebrow">ADMIN USERS</p>
        <h1>Quản lý người dùng</h1>
        <p className="admin-subtitle">
          Xem, chỉnh sửa và khóa tài khoản nhân viên, chủ địa điểm và khách tham quan.
        </p>

        <div className="admin-panel" style={{ marginTop: 24, padding: 20 }}>
          <div className="admin-panel-heading">
            <div>
              <h2>Danh sách người dùng</h2>
              <p>Admin có thể sửa thông tin hoặc khóa/mở khóa tài khoản.</p>
            </div>
            <button type="button" className="admin-refresh" onClick={loadStaff} disabled={staffLoading}>
              {staffLoading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
          {staffError && <p role="alert" className="admin-poi-message error">{staffError}</p>}
          {staffLoading && <p className="admin-poi-empty">Đang tải danh sách người dùng...</p>}
          {!staffLoading && !staffError && staff.length === 0 && (
            <p className="admin-poi-empty">Chưa có tài khoản người dùng.</p>
          )}
          {!staffError && staff.length > 0 && (
            <div className="admin-visitor-table-wrap">
              <table className="admin-visitor-table">
                <thead><tr><th>Tên tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
                <tbody>{staff.map((account) => (
                  <tr key={account.id || account.username}>
                    <td>
                      {editingId === account.id ? (
                        <div style={{ display: "grid", gap: 8, minWidth: 180 }}>
                          <input aria-label="Tên tài khoản mới" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} style={inputStyle} />
                          <input aria-label="Mật khẩu mới (để trống nếu giữ nguyên)" type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="Mật khẩu mới (không bắt buộc)" style={inputStyle} />
                        </div>
                      ) : account.username}
                    </td>
                    <td>{getRoleLabel(account.role)}</td>
                    <td>{account.status === "LOCKED" ? "Đã khóa" : "Đang hoạt động"}</td>
                    <td>{account.createdAt ? new Date(account.createdAt).toLocaleString("vi-VN") : "—"}</td>
                    <td>
                      {editingId === account.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="admin-refresh" disabled={staffActionId === account.id} onClick={() => void saveStaff(account)}>
                            {staffActionId === account.id ? "Đang lưu..." : "Lưu"}
                          </button>
                          <button type="button" className="admin-refresh" disabled={staffActionId === account.id} onClick={() => setEditingId("")}>Hủy</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="admin-refresh" disabled={Boolean(staffActionId)} onClick={() => startEditing(account)}>Sửa</button>
                          <button type="button" className="admin-refresh" disabled={Boolean(staffActionId)} onClick={() => void toggleStaffStatus(account)}>
                            {staffActionId === account.id ? "Đang cập nhật..." : account.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                          </button>
                        </div>
                      )}
                    </td>
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
            <h2 style={{ margin: 0 }}>Tạo tài khoản nhân viên</h2>
            <p className="admin-subtitle" style={{ marginBottom: 0 }}>
              Tài khoản mới được cấp vai trò Nhân viên.
            </p>
          </div>
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
