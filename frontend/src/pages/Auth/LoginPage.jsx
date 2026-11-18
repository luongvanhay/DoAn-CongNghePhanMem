import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound, MapPin } from "lucide-react";
import "./LoginPage.css";

const LOGIN_URL = "/api/auth/login";

export default function LoginPage() {
  const navigate = useNavigate();
  const audience = new URLSearchParams(window.location.search).get("audience");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError("Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Tên tài khoản hoặc mật khẩu không chính xác.",
        );
      }

      if (!data.token) {
        throw new Error("Máy chủ không trả về token đăng nhập.");
      }

      const role = String(data.role || "").toUpperCase();

      // Chỉ chấp nhận những vai trò được hệ thống hỗ trợ.
      const allowedRoles = ["ADMIN", "ADMINSTAFF", "PROVIDER", "VISITOR"];

      if (!allowedRoles.includes(role)) {
        throw new Error("Tài khoản không có vai trò hợp lệ.");
      }

      if (audience === "staff" && !["ADMIN", "ADMINSTAFF"].includes(role)) {
        throw new Error("Tài khoản này không có quyền nhân viên.");
      }
      if (audience === "user" && !["VISITOR", "PROVIDER"].includes(role)) {
        throw new Error("Vui lòng đăng nhập bằng tài khoản người dùng.");
      }

      // Lưu thông tin đăng nhập.
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username || trimmedUsername);
      localStorage.setItem("role", role);

      // Điều hướng theo vai trò.
      switch (role) {
        case "ADMIN":
          navigate("/admin", { replace: true });
          break;

        case "ADMINSTAFF":
          navigate("/staff", { replace: true });
          break;

        case "PROVIDER":
          navigate("/poi-owner/dashboard", { replace: true });
          break;

        case "VISITOR":
        default:
          navigate("/", { replace: true });
          break;
      }
    } catch (err) {
      setError(err.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <span className="brand-icon">
            <MapPin size={25} />
          </span>
          <span>VietPlace</span>
        </div>

        <div className="login-hero">
          <span className="login-eyebrow">KHÁM PHÁ VIỆT NAM</span>
          <h1>Mỗi hành trình bắt đầu từ một điểm đến.</h1>
          <p>
            Đăng nhập để tiếp tục khám phá địa điểm, trải nghiệm những điều thú
            vị và quản lý tài khoản của bạn.
          </p>
        </div>

        <div className="login-visual-footer">
          Khám phá địa điểm. Kết nối hành trình.
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <Link to="/" className="login-back-link">
            ← Quay lại trang chủ
          </Link>

          <div className="login-mobile-brand">
            <MapPin size={24} />
            <span>VietPlace</span>
          </div>

          <div className="login-heading">
            <span className="login-small-label">CHÀO MỪNG TRỞ LẠI</span>
            <h2>
              {audience === "staff"
                ? "Đăng nhập nhân viên"
                : audience === "user"
                  ? "Đăng nhập người dùng"
                  : "Đăng nhập"}
            </h2>
            <p>
              {audience === "staff"
                ? "Đăng nhập bằng tài khoản nhân viên đã được cấp."
                : "Nhập thông tin tài khoản để tiếp tục."}
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-username">Tên tài khoản</label>
              <div className="login-input-wrap">
                <UserRound size={19} />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Nhập tên tài khoản"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="login-input-wrap">
                <LockKeyhole size={19} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="login-divider">
            <span>HOẶC</span>
          </div>

          <div className="login-register">
            Bạn là chủ địa điểm?
            <Link to="/poi-owner/register">Đăng ký tại đây</Link>
          </div>

          <p className="login-security-note">
            <LockKeyhole size={14} />
            Thông tin đăng nhập được gửi qua API của hệ thống.
          </p>
        </div>
      </section>
    </main>
  );
}
