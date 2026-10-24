import { useCallback, useEffect, useState } from "react";
import "./AdminDashboard.css";

// ==================== CẤU HÌNH API ====================

// API lấy thống kê lượt truy cập website
const STATS_URL = "/api/content/visits/stats";

// API đăng nhập tài khoản
const LOGIN_URL = "/api/auth/login";

// API lấy danh sách hồ sơ POI đang chờ Admin duyệt
const PENDING_URL = "/api/auth/poi-owner/applications/pending";

// Giá trị mặc định của các thống kê
const initialStats = {
  totalVisits: 0,
  uniqueVisitors: 0,
  visitsToday: 0,
  uniqueVisitorsToday: 0,
};

// ==================== HÀM HỖ TRỢ ====================

// Chuyển giá trị số thành chuỗi có định dạng Việt Nam
// Ví dụ: 10000 -> 10.000
function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("vi-VN").format(number)
    : "—";
}

// Đọc dữ liệu JSON từ phản hồi API.
// Nếu HTTP không thành công, lấy message từ backend để hiển thị lỗi.
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
    );
  }

  return data;
}

// ==================== THẺ THỐNG KÊ ====================

// Hiển thị một chỉ số thống kê.
// Dùng chung component này cho cả bốn thẻ để tránh lặp code.
function StatCard({ icon, label, value, hint, tone }) {
  return (
    <article className="admin-stat-card">
      <div className={`admin-stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>

      <div className="admin-stat-copy">
        <p>{label}</p>
        <strong>{formatNumber(value)}</strong>
        <span>{hint}</span>
      </div>
    </article>
  );
}

// ==================== GIAO DIỆN ĐĂNG NHẬP ADMIN ====================

function AdminLogin({ onLogin }) {
  // Lưu tên đăng nhập, mật khẩu và trạng thái gửi biểu mẫu
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Xử lý khi Admin gửi biểu mẫu đăng nhập
  async function handleSubmit(event) {
    // Ngăn trình duyệt tải lại trang khi gửi form
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Gửi tên đăng nhập và mật khẩu đến auth-service thông qua API Gateway
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      // Đọc dữ liệu trả về; nếu đăng nhập thất bại sẽ phát sinh lỗi
      const data = await readResponse(response);

      // Chỉ cho phép tài khoản có role ADMIN vào dashboard
      // Kiểm tra role ở frontend không thay thế việc bảo vệ API ở backend
      if (data.role !== "ADMIN" || !data.token) {
        throw new Error("Tài khoản này không có quyền quản trị Admin.");
      }

      // Gửi JWT và tên Admin lên component cha để cập nhật trạng thái đăng nhập
      onLogin(data.token, data.username);
    } catch (err) {
      // Hiển thị lỗi đăng nhập cho người dùng
      setError(err.message || "Không thể đăng nhập.");
    } finally {
      // Kết thúc trạng thái chờ dù đăng nhập thành công hay thất bại
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#f6f7fb",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 30,
          border: "1px solid #ececf4",
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 12px 40px #25214c0c",
        }}
      >
        {/* Logo và tiêu đề trang đăng nhập */}
        <div className="admin-brand-mark" style={{ marginBottom: 20 }}>
          D
        </div>

        <p className="admin-eyebrow">DOAN CMS</p>

        <h1 style={{ margin: "0 0 8px", fontSize: 25 }}>Đăng nhập quản trị</h1>

        <p className="admin-subtitle" style={{ marginBottom: 24 }}>
          Đăng nhập bằng tài khoản có quyền ADMIN.
        </p>

        {/* Ô nhập tên đăng nhập */}
        <label
          htmlFor="admin-username"
          style={{ display: "block", marginBottom: 7, fontSize: 12 }}
        >
          Tên đăng nhập
        </label>

        <input
          id="admin-username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          style={loginInputStyle}
        />

        {/* Ô nhập mật khẩu */}
        <label
          htmlFor="admin-password"
          style={{
            display: "block",
            margin: "16px 0 7px",
            fontSize: 12,
          }}
        >
          Mật khẩu
        </label>

        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          style={loginInputStyle}
        />

        {/* Hiển thị lỗi nếu đăng nhập không thành công */}
        {error && (
          <p role="alert" className="admin-poi-message error">
            {error}
          </p>
        )}

        {/* Khóa nút trong lúc gửi yêu cầu đăng nhập */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 13,
            border: 0,
            borderRadius: 10,
            background: "#6958d1",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

// CSS dùng chung cho hai ô nhập trên form đăng nhập
const loginInputStyle = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #e1e2ed",
  borderRadius: 9,
  font: "inherit",
  fontSize: 13,
  outlineColor: "#7968e7",
};

// ==================== QUẢN LÝ HỒ SƠ POI ====================

function PoiApplications({ token }) {
  // Danh sách hồ sơ mà backend trả về
  const [applications, setApplications] = useState([]);

  // Trạng thái tải danh sách, lỗi, thông báo và hồ sơ đang được xử lý
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState("");

  // Tải danh sách hồ sơ POI đang chờ duyệt
  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(PENDING_URL, {
        headers: {
          Accept: "application/json",

          // JWT giúp backend xác định người gửi là Admin đã đăng nhập
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readResponse(response);

      // API hiện tại được thiết kế để trả về một mảng hồ sơ
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu hồ sơ trả về không đúng định dạng.");
      }

      setApplications(data);
    } catch (err) {
      setError(err.message || "Không tải được danh sách hồ sơ POI.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Tự tải danh sách khi component được hiển thị hoặc JWT thay đổi
  useEffect(() => {
    const timerId = setTimeout(() => {
      loadApplications();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadApplications]);

  // Xử lý thao tác duyệt hoặc từ chối một hồ sơ
  async function reviewApplication(application, approved) {
    let rejectionReason;

    // Nếu từ chối, yêu cầu Admin nhập lý do
    if (!approved) {
      rejectionReason = window.prompt(
        `Nhập lý do từ chối hồ sơ "${application.businessName || ""}":`,
      );

      // Admin bấm Cancel thì không gửi yêu cầu
      if (rejectionReason === null) return;

      // Không chấp nhận lý do rỗng
      if (!rejectionReason.trim()) {
        setError("Vui lòng nhập lý do từ chối.");
        return;
      }
    }

    // Xác nhận lại trước khi thực hiện thay đổi trạng thái hồ sơ
    const action = approved ? "duyệt" : "từ chối";
    const confirmed = window.confirm(
      `Bạn có chắc muốn ${action} hồ sơ "${application.businessName || ""}"?`,
    );

    if (!confirmed) return;

    setProcessingId(application.id);
    setError("");
    setMessage("");

    try {
      // Gửi quyết định duyệt/từ chối và JWT lên backend
      const response = await fetch(
        `/api/auth/poi-owner/applications/${encodeURIComponent(application.id)}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            approved,

            // Hồ sơ được duyệt không cần lý do từ chối
            rejectionReason: approved ? null : rejectionReason.trim(),
          }),
        },
      );

      const data = await readResponse(response);

      // Hiển thị thông báo thành công từ backend
      setMessage(data.message || "Đã xử lý hồ sơ.");

      // Tải lại danh sách để hồ sơ đã xử lý không còn trong danh sách chờ
      await loadApplications();
    } catch (err) {
      setError(err.message || "Không thể xử lý hồ sơ.");
    } finally {
      // Cho phép thao tác tiếp sau khi yêu cầu hoàn tất
      setProcessingId("");
    }
  }

  return (
    <section className="admin-poi-section" id="content">
      <article className="admin-poi-panel">
        {/* Tiêu đề và số lượng hồ sơ đang chờ duyệt */}
        <div className="admin-poi-heading">
          <div>
            <h2>Duyệt hồ sơ POI Owner</h2>
            <p>
              Xem thông tin đăng ký và duyệt hoặc từ chối hồ sơ nhà cung cấp địa
              điểm.
            </p>
          </div>

          <span className="admin-poi-count">
            {applications.length} hồ sơ chờ duyệt
          </span>
        </div>

        {/* Nút tải lại danh sách từ backend */}
        <div style={{ marginBottom: 16 }}>
          <button
            className="admin-refresh"
            type="button"
            onClick={loadApplications}
            disabled={loading || Boolean(processingId)}
          >
            ↻ {loading ? "Đang tải..." : "Làm mới hồ sơ"}
          </button>
        </div>

        {/* Thông báo kết quả hoặc lỗi */}
        {message && (
          <div className="admin-poi-message" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="admin-poi-message error" role="alert">
            {error}
          </div>
        )}

        {/* Phân biệt trạng thái đang tải, danh sách rỗng và có dữ liệu */}
        {loading ? (
          <div className="admin-poi-empty">Đang tải danh sách hồ sơ...</div>
        ) : applications.length === 0 ? (
          <div className="admin-poi-empty">
            Không có hồ sơ nào đang chờ duyệt.
          </div>
        ) : (
          <div className="admin-poi-list">
            {/* Tạo một thẻ giao diện cho mỗi hồ sơ */}
            {applications.map((application) => {
              const id = application.id;
              const busy = processingId === id;

              return (
                <article className="admin-poi-card" key={id}>
                  <div className="admin-poi-card-header">
                    <div>
                      <h3>{application.businessName || "Chưa có tên cơ sở"}</h3>
                      <p className="admin-poi-contact">
                        Người liên hệ: {application.contactName || "—"}
                      </p>
                    </div>

                    <span className="admin-poi-status">Chờ duyệt</span>
                  </div>

                  {/* Các thông tin được gửi trong hồ sơ đăng ký */}
                  <div className="admin-poi-details">
                    <div className="admin-poi-detail">
                      <strong>Số điện thoại</strong>
                      <span>{application.phone || "—"}</span>
                    </div>

                    <div className="admin-poi-detail">
                      <strong>Email</strong>
                      <span>{application.email || "—"}</span>
                    </div>

                    <div className="admin-poi-detail">
                      <strong>Địa chỉ</strong>
                      <span>{application.address || "—"}</span>
                    </div>

                    <div className="admin-poi-detail">
                      <strong>Ngày gửi hồ sơ</strong>
                      <span>
                        {application.submittedAt
                          ? new Date(application.submittedAt).toLocaleString(
                              "vi-VN",
                            )
                          : "—"}
                      </span>
                    </div>

                    {/* Chỉ hiển thị mô tả nếu người đăng ký đã nhập */}
                    {application.description && (
                      <div className="admin-poi-detail">
                        <strong>Mô tả</strong>
                        <span>{application.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Hai nút gửi quyết định xử lý hồ sơ */}
                  <div className="admin-poi-actions">
                    <button
                      type="button"
                      className="admin-poi-button reject"
                      disabled={Boolean(processingId)}
                      onClick={() => reviewApplication(application, false)}
                    >
                      {busy ? "Đang xử lý..." : "Từ chối"}
                    </button>

                    <button
                      type="button"
                      className="admin-poi-button approve"
                      disabled={Boolean(processingId)}
                      onClick={() => reviewApplication(application, true)}
                    >
                      {busy ? "Đang xử lý..." : "Duyệt hồ sơ"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}

// ==================== TRANG QUẢN TRỊ CHÍNH ====================

export default function AdminDashboard() {
  // token được giữ trong state React, không lưu vào localStorage
  const [token, setToken] = useState("");

  // Tên Admin dùng để hiển thị ở thanh bên
  const [adminUsername, setAdminUsername] = useState("");

  // Trạng thái dữ liệu thống kê
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Gọi API thống kê và cập nhật bốn chỉ số trên dashboard
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(STATS_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Không tải được thống kê (HTTP ${response.status}).`);
      }

      const data = await response.json();

      // Dùng 0 nếu backend không trả về một chỉ số nào đó
      setStats({
        totalVisits: data.totalVisits ?? 0,
        uniqueVisitors: data.uniqueVisitors ?? 0,
        visitsToday: data.visitsToday ?? 0,
        uniqueVisitorsToday: data.uniqueVisitorsToday ?? 0,
      });

      // Ghi lại thời điểm dữ liệu được tải thành công
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        `${err.message} Kiểm tra API ${STATS_URL} và cấu hình proxy/API Gateway.`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải thống kê khi trang quản trị được khởi tạo
  // Tải thống kê khi trang quản trị được khởi tạo
  useEffect(() => {
    const timerId = setTimeout(() => {
      loadStats();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadStats]);

  // Định dạng giờ cập nhật gần nhất để hiển thị trên giao diện
  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Chưa có dữ liệu";

  // Nếu chưa đăng nhập, chỉ hiển thị form đăng nhập
  if (!token) {
    return (
      <AdminLogin
        onLogin={(newToken, username) => {
          setToken(newToken);
          setAdminUsername(username || "Admin");
        }}
      />
    );
  }

  return (
    <div className="admin-shell">
      {/* Thanh điều hướng bên trái */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">D</div>
          <div>
            <strong>DoAn CMS</strong>
            <span>TRANG QUẢN TRỊ</span>
          </div>
        </div>

        <div className="admin-nav-label">TỔNG QUAN</div>

        {/* Các liên kết chuyển đến từng khu vực trên trang */}
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          <a
            className="admin-nav-item active"
            href="#dashboard"
            aria-current="page"
          >
            <span className="admin-nav-symbol">▦</span> Bảng điều khiển
          </a>

          <a className="admin-nav-item" href="#visits">
            <span className="admin-nav-symbol">↗</span> Thống kê truy cập
          </a>

          <a className="admin-nav-item" href="#content">
            <span className="admin-nav-symbol">▤</span> Duyệt hồ sơ POI
          </a>
        </nav>

        {/* Thông tin tài khoản đang đăng nhập */}
        <div className="admin-sidebar-bottom">
          <div className="admin-status-dot" />
          <div>
            <strong>{adminUsername}</strong>
            <span>Quản trị viên</span>
          </div>
        </div>
      </aside>

      <main className="admin-main" id="dashboard">
        {/* Thanh trên cùng: đường dẫn, trạng thái và đăng xuất */}
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            Quản trị <span>/</span> <strong>Bảng điều khiển</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-live">
              <i /> Đang theo dõi
            </span>

            {/* Xóa JWT khỏi state để quay lại màn hình đăng nhập */}
            <button
              type="button"
              className="admin-refresh"
              onClick={() => {
                setToken("");
                setAdminUsername("");
              }}
            >
              Đăng xuất
            </button>

            <div className="admin-avatar" aria-label="Quản trị viên">
              AD
            </div>
          </div>
        </header>

        {/* Tiêu đề trang và nút tải lại thống kê */}
        <section className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">TỔNG QUAN WEBSITE</p>
            <h1>Bảng điều khiển</h1>
            <p className="admin-subtitle">
              Theo dõi hoạt động và lượt truy cập website của bạn.
            </p>
          </div>

          <button
            className="admin-refresh"
            type="button"
            onClick={loadStats}
            disabled={loading}
          >
            <span
              className={
                loading ? "admin-refresh-icon spinning" : "admin-refresh-icon"
              }
            >
              ↻
            </span>
            {loading ? "Đang tải..." : "Làm mới dữ liệu"}
          </button>
        </section>

        {/* Hiển thị lỗi nếu API thống kê không phản hồi thành công */}
        {error && (
          <div className="admin-alert" role="alert">
            <strong>Thông báo thống kê</strong>
            <span>{error}</span>
            <button type="button" onClick={loadStats}>
              Thử lại
            </button>
          </div>
        )}

        {/* Bốn thẻ thống kê lượt truy cập */}
        <section
          className="admin-stats-grid"
          id="visits"
          aria-label="Số liệu truy cập"
        >
          <StatCard
            icon="↗"
            tone="purple"
            label="Tổng lượt truy cập"
            value={stats.totalVisits}
            hint="Tất cả lượt đã ghi nhận"
          />

          <StatCard
            icon="◎"
            tone="blue"
            label="Khách truy cập duy nhất"
            value={stats.uniqueVisitors}
            hint="Tính theo mã khách truy cập"
          />

          <StatCard
            icon="◷"
            tone="orange"
            label="Lượt truy cập hôm nay"
            value={stats.visitsToday}
            hint="Trong ngày hiện tại"
          />

          <StatCard
            icon="♙"
            tone="green"
            label="Khách hôm nay"
            value={stats.uniqueVisitorsToday}
            hint="Khách riêng biệt hôm nay"
          />
        </section>

        {/* Hai bảng tổng quan và trạng thái API */}
        <section className="admin-content-grid">
          <article className="admin-panel admin-overview-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Tổng quan truy cập</h2>
                <p>Số liệu mới nhất từ hệ thống ghi nhận lượt truy cập.</p>
              </div>
              <span className="admin-period-chip">Hiện tại</span>
            </div>

            {/* Khu vực hiển thị tổng lượt truy cập */}
            <div className="admin-overview-visual">
              <div className="admin-visual-orb orb-one" />
              <div className="admin-visual-orb orb-two" />
              <div className="admin-overview-icon">↗</div>
              <strong>{loading ? "…" : formatNumber(stats.totalVisits)}</strong>
              <span>Tổng lượt truy cập đã ghi nhận</span>
              <div className="admin-overview-line">
                <span />
              </div>
            </div>

            <div className="admin-panel-foot">
              <span>
                <i className="admin-key-dot purple-dot" /> Tổng lượt truy cập
              </span>
              <span className="admin-foot-note">Cập nhật: {timeLabel}</span>
            </div>
          </article>

          <article className="admin-panel admin-quick-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Trạng thái hệ thống</h2>
                <p>Tình trạng kết nối dữ liệu thống kê.</p>
              </div>

              <span
                className={`admin-status-pill ${error ? "offline" : "online"}`}
              >
                {loading ? "Đang tải" : error ? "Chưa kết nối" : "Đã phản hồi"}
              </span>
            </div>

            {/* Trạng thái kết nối API */}
            <div className="admin-system-row">
              <div className="admin-system-icon">API</div>
              <div className="admin-system-text">
                <strong>API thống kê</strong>
                <span>{STATS_URL}</span>
              </div>
              <span className={`admin-system-check ${error ? "bad" : ""}`}>
                {loading ? "…" : error ? "!" : "✓"}
              </span>
            </div>

            {/* Trạng thái khu vực dữ liệu thống kê */}
            <div className="admin-system-row">
              <div className="admin-system-icon database">DB</div>
              <div className="admin-system-text">
                <strong>Dữ liệu truy cập</strong>
                <span>Visit statistics</span>
              </div>
              <span className={`admin-system-check ${error ? "bad" : ""}`}>
                {loading ? "…" : error ? "!" : "✓"}
              </span>
            </div>

            <button
              className="admin-secondary-button"
              type="button"
              onClick={loadStats}
              disabled={loading}
            >
              Kiểm tra kết nối <span>→</span>
            </button>
          </article>
        </section>

        {/* Khu vực duyệt/từ chối hồ sơ POI; truyền JWT xuống component */}
        <PoiApplications token={token} />

        {/* Chân trang quản trị */}
        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} DoAn CMS</span>
          <span>
            Bảng điều khiển quản trị <b>•</b> Thống kê lượt truy cập
          </span>
        </footer>
      </main>
    </div>
  );
}
