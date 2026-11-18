import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { languages } from "../../i18n";
import "./AdminDashboard.css";
import CashPaymentManager from "./CashPaymentManager.jsx";
import { formatNumber, readResponse } from "./adminUtils.js";
import UserAccountManager from "./UserAccountManager.jsx";

// ==================== CẤU HÌNH API ====================

// API lấy thống kê lượt truy cập website
const STATS_URL = "/api/content/visits/stats";
const VISITOR_LOG_URL = "/api/content/visits/recent";
const ACTIVE_VISITORS_URL = "/api/content/visits/active";
const PAYMENT_STATS_URL = "/api/content/payments/stats";
const USERS_URL = "/api/auth/admin/users";
const PENDING_POI_URL = "/api/auth/poi-owner/applications/pending";
const PENDING_CASH_URL = "/api/content/payments/cash/pending";
const ACTIVE_VISITORS_UPDATE_SECONDS = 2;

// API đăng nhập tài khoản
const LOGIN_URL = "/api/auth/login";

// API lấy danh sách hồ sơ POI đang chờ Admin duyệt
const PENDING_URL = "/api/auth/poi-owner/applications/pending";
const APPROVED_POI_OWNERS_URL = "/api/auth/poi-owner/applications/approved";

// API quản lý địa điểm và nội dung thuyết minh
const CONTENTS_URL = "/api/content/contents";

// Giá trị mặc định của các thống kê
const initialStats = {
  totalVisits: 0,
  uniqueVisitors: 0,
  visitsToday: 0,
  uniqueVisitorsToday: 0,
  totalIncome: 0,
  paidTransactions: 0,
};

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
        background: "#fff",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 30,
          border: "1px solid #e7ece9",
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 16px 44px #12351f10",
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
            background: "#267456",
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
  const [approvedApplications, setApprovedApplications] = useState([]);

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
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const [pendingResponse, approvedResponse] = await Promise.all([
        fetch(PENDING_URL, { headers }),
        fetch(APPROVED_POI_OWNERS_URL, { headers }),
      ]);
      const [data, approvedData] = await Promise.all([
        readResponse(pendingResponse),
        readResponse(approvedResponse),
      ]);

      // API hiện tại được thiết kế để trả về một mảng hồ sơ
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu hồ sơ trả về không đúng định dạng.");
      }

      setApplications(data);
      if (!Array.isArray(approvedData)) {
        throw new Error("Danh sách địa điểm đã duyệt không đúng định dạng.");
      }
      setApprovedApplications(approvedData);
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

      <article className="admin-poi-panel" style={{ marginTop: 20 }}>
        <div className="admin-poi-heading">
          <div>
            <h2>Địa điểm đã duyệt</h2>
            <p>Các hồ sơ POI Owner đã được Admin chấp thuận.</p>
          </div>
          <span className="admin-poi-count">
            {approvedApplications.length} địa điểm
          </span>
        </div>

        {loading ? (
          <div className="admin-poi-empty">Đang tải danh sách địa điểm đã duyệt...</div>
        ) : approvedApplications.length === 0 ? (
          <div className="admin-poi-empty">Chưa có địa điểm nào được duyệt.</div>
        ) : (
          <div className="admin-poi-list">
            {approvedApplications.map((application) => (
              <article className="admin-poi-card" key={application.id}>
                <div className="admin-poi-card-header">
                  <div>
                    <h3>{application.businessName || "Chưa có tên cơ sở"}</h3>
                    <p className="admin-poi-contact">
                      Người liên hệ: {application.contactName || "—"}
                    </p>
                  </div>
                  <span className="admin-poi-status">Đã duyệt</span>
                </div>
                <div className="admin-poi-details">
                  <div className="admin-poi-detail">
                    <strong>Địa chỉ</strong>
                    <span>{application.address || "—"}</span>
                  </div>
                  <div className="admin-poi-detail">
                    <strong>Điện thoại</strong>
                    <span>{application.phone || "—"}</span>
                  </div>
                  <div className="admin-poi-detail">
                    <strong>Email</strong>
                    <span>{application.email || "—"}</span>
                  </div>
                  <div className="admin-poi-detail">
                    <strong>Ngày duyệt</strong>
                    <span>
                      {application.reviewedAt
                        ? new Date(application.reviewedAt).toLocaleString("vi-VN")
                        : "—"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

// ==================== QUẢN LÝ ĐỊA ĐIỂM VÀ THUYẾT MINH ====================

const emptyContentForm = {
  title: "",
  location: "",
  body: "",
  sourceLanguage: "vi",
  translations: [],
  latitude: "",
  longitude: "",
  triggerRadius: 30,
  imageUrl: "",
  audioPriority: 0,
  active: true,
};

function ContentManager({ token }) {
  const [contents, setContents] = useState([]);
  const [form, setForm] = useState(emptyContentForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadContents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(CONTENTS_URL, {
        headers: { Accept: "application/json" },
      });
      const data = await readResponse(response);

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu địa điểm trả về không đúng định dạng.");
      }

      setContents(data);
    } catch (err) {
      setError(err.message || "Không tải được danh sách địa điểm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(loadContents, 0);
    return () => clearTimeout(timerId);
  }, [loadContents]);

  function startEditing(content) {
    setEditingId(content.id);
    setForm({
      ...emptyContentForm,
      title: content.title || "",
      location: content.location || "",
      body: content.body || "",
      sourceLanguage: content.sourceLanguage || "vi",
      translations: Array.isArray(content.translations)
        ? content.translations
        : [],
      latitude: content.latitude ?? "",
      longitude: content.longitude ?? "",
      triggerRadius: content.triggerRadius ?? 30,
      imageUrl: content.imageUrl || "",
      audioPriority: content.audioPriority ?? 0,
      active: content.active !== false,
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyContentForm);
    setMessage("");
    setError("");
  }

  function updateTranslation(languageCode, field, value) {
    setForm((current) => {
      const existing = current.translations.find(
        (translation) => translation.languageCode === languageCode,
      );
      const translations = existing
        ? current.translations.map((translation) =>
            translation.languageCode === languageCode
              ? { ...translation, [field]: value }
              : translation,
          )
        : [
            ...current.translations,
            {
              languageCode,
              title: current.title,
              description: "",
              [field]: value,
            },
          ];

      return { ...current, translations };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
      body: form.body.trim(),
      sourceLanguage: form.sourceLanguage.trim().toLowerCase(),
      translations: form.translations
        .filter(
          (translation) =>
            translation.languageCode !==
              form.sourceLanguage.trim().toLowerCase() &&
            translation.description?.trim(),
        )
        .map((translation) => ({
          languageCode: translation.languageCode,
          title: translation.title?.trim() || form.title.trim(),
          description: translation.description.trim(),
          audioUrl: translation.audioUrl || null,
        })),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      triggerRadius: Number(form.triggerRadius),
      audioPriority: Number(form.audioPriority),
    };
    const url = editingId
      ? `${CONTENTS_URL}/${encodeURIComponent(editingId)}`
      : CONTENTS_URL;

    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const savedContent = await readResponse(response);

      setContents((current) =>
        editingId
          ? current.map((content) =>
              content.id === savedContent.id ? savedContent : content,
            )
          : [savedContent, ...current],
      );
      setMessage(
        editingId
          ? "Đã cập nhật địa điểm và nội dung thuyết minh."
          : "Đã thêm địa điểm và lưu vào MongoDB.",
      );
      setEditingId("");
      setForm(emptyContentForm);
    } catch (err) {
      setError(err.message || "Không thể lưu nội dung địa điểm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-poi-section" id="manage-content">
      <article className="admin-poi-panel">
        <div className="admin-poi-heading">
          <div>
            <h2>Quản lý địa điểm và thuyết minh</h2>
            <p>
              Thêm địa điểm mới hoặc chỉnh sửa nội dung đang hiển thị trên bản
              đồ. Thay đổi được lưu trong MongoDB.
            </p>
          </div>
          <span className="admin-poi-count">{contents.length} địa điểm</span>
        </div>

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

        <form className="admin-content-form" onSubmit={handleSubmit}>
          <label>
            Tên địa điểm
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              maxLength={255}
              required
            />
          </label>

          <label>
            Loại địa điểm / địa chỉ
            <input
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
              maxLength={255}
            />
          </label>

          <label className="wide">
            Nội dung thuyết minh
            <textarea
              value={form.body}
              onChange={(event) =>
                setForm({ ...form, body: event.target.value })
              }
              rows={5}
              required
            />
          </label>

          <details className="admin-content-translations wide">
            <summary>
              Bản dịch thuyết minh (
              {
                form.translations.filter((translation) =>
                  translation.description?.trim(),
                ).length
              }
              )
            </summary>
            <p>
              Nhập lời thuyết minh đã dịch cho từng ngôn ngữ. Bản dịch được lưu
              trong MongoDB và sẽ được dùng để hiển thị, phát âm thanh. Ngôn ngữ
              chưa có bản dịch sẽ cần dịch vụ dịch tự động.
            </p>
            <div className="admin-content-translation-list">
              {languages
                .filter(
                  (language) =>
                    language.code !== form.sourceLanguage.trim().toLowerCase(),
                )
                .map((language) => {
                  const translation = form.translations.find(
                    (item) => item.languageCode === language.code,
                  );

                  return (
                    <label key={language.code}>
                      Thuyết minh · {language.label}
                      <textarea
                        value={translation?.description || ""}
                        onChange={(event) =>
                          updateTranslation(
                            language.code,
                            "description",
                            event.target.value,
                          )
                        }
                        rows={3}
                        placeholder={`Nhập nội dung bằng ${language.label}`}
                      />
                    </label>
                  );
                })}
            </div>
          </details>

          <label>
            Ngôn ngữ nội dung
            <input
              value={form.sourceLanguage}
              onChange={(event) =>
                setForm({ ...form, sourceLanguage: event.target.value })
              }
              minLength={2}
              maxLength={10}
              required
            />
          </label>

          <label>
            Vĩ độ
            <input
              type="number"
              value={form.latitude}
              onChange={(event) =>
                setForm({ ...form, latitude: event.target.value })
              }
              min="-90"
              max="90"
              step="any"
              required
            />
          </label>

          <label>
            Kinh độ
            <input
              type="number"
              value={form.longitude}
              onChange={(event) =>
                setForm({ ...form, longitude: event.target.value })
              }
              min="-180"
              max="180"
              step="any"
              required
            />
          </label>

          <label>
            Bán kính kích hoạt (m)
            <input
              type="number"
              value={form.triggerRadius}
              onChange={(event) =>
                setForm({ ...form, triggerRadius: event.target.value })
              }
              min="1"
              required
            />
          </label>

          <label>
            Đường dẫn ảnh (không bắt buộc)
            <input
              type="url"
              value={form.imageUrl}
              onChange={(event) =>
                setForm({ ...form, imageUrl: event.target.value })
              }
              maxLength={500}
            />
          </label>

          <label className="admin-content-checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
            />
            Địa điểm đang hoạt động
          </label>

          <div className="admin-content-form-actions">
            <button
              className="admin-poi-button approve"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Đang lưu..."
                : editingId
                  ? "Lưu thay đổi"
                  : "Thêm địa điểm"}
            </button>
            {editingId && (
              <button
                className="admin-poi-button reject"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <div className="admin-content-list-heading">
          <h3>Địa điểm đã lưu</h3>
          <button
            className="admin-refresh"
            type="button"
            onClick={loadContents}
            disabled={loading || saving}
          >
            ↻ {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {loading ? (
          <div className="admin-poi-empty">Đang tải danh sách địa điểm...</div>
        ) : contents.length === 0 ? (
          <div className="admin-poi-empty">Chưa có địa điểm nào.</div>
        ) : (
          <div className="admin-poi-list">
            {contents.map((content) => (
              <article className="admin-poi-card" key={content.id}>
                <div className="admin-poi-card-header">
                  <div>
                    <h3>{content.title || "Địa điểm chưa có tên"}</h3>
                    <p className="admin-poi-contact">
                      {content.location || "Chưa có địa chỉ"} ·{" "}
                      {content.active === false ? "Đang ẩn" : "Đang hoạt động"}
                    </p>
                  </div>
                  <button
                    className="admin-poi-button approve"
                    type="button"
                    onClick={() => startEditing(content)}
                  >
                    Sửa nội dung
                  </button>
                </div>
                <div className="admin-poi-details">
                  <div className="admin-poi-detail">
                    <strong>Tọa độ</strong>
                    <span>
                      {content.latitude ?? "—"}, {content.longitude ?? "—"}
                    </span>
                  </div>
                  <div className="admin-poi-detail">
                    <strong>Thuyết minh</strong>
                    <span>{content.body || "Chưa có nội dung."}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function VisitorQrCard() {
  const [siteUrl, setSiteUrl] = useState(window.location.origin);
  const visitorUrl = (() => {
    try {
      const url = new URL("/", siteUrl);
      url.searchParams.set("source", "qr");
      return url.toString();
    } catch {
      return "";
    }
  })();

  function downloadQrCode() {
    const svg = document.querySelector("#visitor-qr-code svg");
    if (!svg) {
      return;
    }

    const svgBlob = new Blob([svg.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "son-tra-visitor-qr.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  return (
    <section className="admin-poi-section" aria-labelledby="visitor-qr-title">
      <article className="admin-poi-panel admin-qr-panel">
        <div>
          <h2 id="visitor-qr-title">Mã QR dành cho khách tham quan</h2>
          <p>
            Khách quét mã sẽ mở trang chọn một trong 15 ngôn ngữ trước khi xem
            bản đồ và nghe thuyết minh.
          </p>
          <label className="admin-qr-input">
            Địa chỉ website khách có thể truy cập
            <input
              type="url"
              value={siteUrl}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder="https://ten-mien-cua-ban"
              required
            />
          </label>
          <p className="admin-qr-warning">
            Không dùng localhost khi in QR cho khách; hãy nhập tên miền đã triển
            khai hoặc địa chỉ mạng mà điện thoại khách truy cập được.
          </p>
          <a
            className="admin-qr-url"
            href={visitorUrl || undefined}
            target="_blank"
            rel="noreferrer"
          >
            {visitorUrl}
          </a>
          <button
            className="admin-poi-button approve"
            type="button"
            onClick={downloadQrCode}
            disabled={!visitorUrl}
          >
            Tải mã QR để in
          </button>
        </div>
        <div id="visitor-qr-code" className="admin-qr-code">
          {visitorUrl ? (
            <QRCodeSVG value={visitorUrl} size={180} level="H" includeMargin />
          ) : (
            <span>Nhập URL hợp lệ</span>
          )}
        </div>
      </article>
    </section>
  );
}

function VisitorLog({ token }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(VISITOR_LOG_URL, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await readResponse(response);

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu lượt truy cập không đúng định dạng.");
      }

      setVisits(data);
    } catch (err) {
      setError(err.message || "Không tải được danh sách lượt truy cập.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadVisits();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadVisits]);

  return (
    <section className="admin-poi-section" aria-labelledby="visitor-log-title">
      <article className="admin-poi-panel">
        <div className="admin-content-list-heading">
          <div>
            <h2 id="visitor-log-title">Khách đã quét QR / truy cập</h2>
            <p>
              Mã khách được tạo ngẫu nhiên trên trình duyệt; không thu thập
              thông tin tài khoản cá nhân.
            </p>
          </div>
          <button
            className="admin-refresh"
            type="button"
            onClick={loadVisits}
            disabled={loading}
          >
            ↻ {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {error && (
          <div className="admin-poi-message error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-poi-empty">Đang tải lịch sử truy cập...</div>
        ) : visits.length === 0 ? (
          <div className="admin-poi-empty">
            Chưa ghi nhận lượt nào. Hãy quét mã QR để thử.
          </div>
        ) : (
          <div className="admin-visitor-table-wrap">
            <table className="admin-visitor-table">
              <thead>
                <tr>
                  <th>Mã khách</th>
                  <th>Nguồn</th>
                  <th>Ngôn ngữ</th>
                  <th>Thời gian truy cập</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <code>{visit.visitorId}</code>
                    </td>
                    <td>
                      {visit.source === "qr" ? "Quét QR" : "Truy cập trực tiếp"}
                    </td>
                    <td>
                      {languages.find(
                        (language) => language.code === visit.language,
                      )?.label ||
                        (visit.language ? visit.language : "Chưa chọn")}
                    </td>
                    <td>
                      {visit.visitedAt
                        ? new Date(visit.visitedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

// ==================== TRANG QUẢN TRỊ CHÍNH ====================

export default function AdminDashboard() {
  const location = useLocation();

  const currentPath = location.pathname.replace(/\/+$/, "") || "/admin";

  const routePage =
    currentPath === "/admin" || currentPath === "/admin/"
      ? "dashboard"
      : currentPath.replace("/admin/", "");
  const currentPage = routePage === "staff" ? "users" : routePage;
  const pageTitles = {
    dashboard: "Bảng điều khiển",
    visits: "Thống kê truy cập",
    payments: "Giao dịch thanh toán",
    "poi-owners": "Duyệt hồ sơ POI",
    contents: "Quản lý thuyết minh",
    users: "Quản lý người dùng",
  };
  const pageTitle = pageTitles[currentPage] || pageTitles.dashboard;
  // token được giữ trong state React, không lưu vào localStorage
  const [token, setToken] = useState("");

  // Tên Admin dùng để hiển thị ở thanh bên
  const [adminUsername, setAdminUsername] = useState("");

  // Trạng thái dữ liệu thống kê
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [activeVisitorsError, setActiveVisitorsError] = useState("");
  const [overviewCounts, setOverviewCounts] = useState({
    users: 0,
    poiRequests: 0,
    cashPayments: 0,
  });
  const [overviewCountsLoading, setOverviewCountsLoading] = useState(false);
  const [overviewCountsError, setOverviewCountsError] = useState("");

  // Gọi API thống kê và cập nhật bốn chỉ số trên dashboard

  // Gọi API thống kê lượt truy cập
  const loadStats = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const [response, paymentResponse] = await Promise.all([
        fetch(STATS_URL, { method: "GET", headers }),
        fetch(PAYMENT_STATS_URL, { method: "GET", headers }),
      ]);
      const [data, paymentData] = await Promise.all([
        readResponse(response),
        readResponse(paymentResponse),
      ]);

      setStats({
        totalVisits: data.totalVisits ?? 0,
        uniqueVisitors: data.uniqueVisitors ?? 0,
        visitsToday: data.visitsToday ?? 0,
        uniqueVisitorsToday: data.uniqueVisitorsToday ?? 0,
        totalIncome: paymentData.totalIncome ?? 0,
        paidTransactions: paymentData.paidTransactions ?? 0,
      });

      setLastUpdated(new Date());
    } catch (err) {
      setError(
        `${err.message || "Không tải được thống kê."} ` +
          `Kiểm tra API ${STATS_URL} và cấu hình Gateway.`,
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadActiveVisitors = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(ACTIVE_VISITORS_URL, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await readResponse(response);
      setActiveVisitors(data.activeVisitors ?? 0);
      setActiveVisitorsError("");
    } catch (err) {
      setActiveVisitorsError(err.message || "Không tải được số khách đang truy cập.");
    }
  }, [token]);

  const loadOverviewCounts = useCallback(async () => {
    if (!token) return;
    setOverviewCountsLoading(true);
    setOverviewCountsError("");

    try {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const [usersResponse, poiResponse, cashResponse] = await Promise.all([
        fetch(USERS_URL, { headers }),
        fetch(PENDING_POI_URL, { headers }),
        fetch(PENDING_CASH_URL, { headers }),
      ]);
      const [users, poiRequests, cashPayments] = await Promise.all([
        readResponse(usersResponse),
        readResponse(poiResponse),
        readResponse(cashResponse),
      ]);

      if (!Array.isArray(users) || !Array.isArray(poiRequests) || !Array.isArray(cashPayments)) {
        throw new Error("Máy chủ trả về dữ liệu thống kê không hợp lệ.");
      }

      setOverviewCounts({
        users: users.length,
        poiRequests: poiRequests.length,
        cashPayments: cashPayments.length,
      });
    } catch (err) {
      setOverviewCountsError(err.message || "Không tải được số liệu tổng quan.");
    } finally {
      setOverviewCountsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !["dashboard", "visits"].includes(currentPage)) return undefined;
    const initialTimerId = window.setTimeout(() => void loadActiveVisitors(), 0);
    const timerId = window.setInterval(
      loadActiveVisitors,
      ACTIVE_VISITORS_UPDATE_SECONDS * 1000,
    );
    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(timerId);
    };
  }, [token, currentPage, loadActiveVisitors]);

  useEffect(() => {
    if (!token || currentPage !== "dashboard") return undefined;
    const timerId = window.setTimeout(() => void loadOverviewCounts(), 0);
    return () => window.clearTimeout(timerId);
  }, [token, currentPage, loadOverviewCounts]);

  // Chỉ tải thống kê khi Admin đã đăng nhập
  useEffect(() => {
    if (!token) return undefined;

    const timerId = setTimeout(() => {
      void loadStats();
    }, 0);

    return () => clearTimeout(timerId);
  }, [token, loadStats]);

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
            <strong>Trang Quản Trị</strong>
            <span>Xin Chào Admin</span>
          </div>
        </div>

        <div className="admin-nav-label">TỔNG QUAN</div>

        {/* Các liên kết chuyển đến từng khu vực trên trang */}
        <nav className="admin-nav" aria-label="Điều hướng quản trị">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">▦</span>
            Bảng điều khiển
          </NavLink>

          <NavLink
            to="/admin/visits"
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">↗</span>
            Thống kê truy cập
          </NavLink>

          <NavLink
            to="/admin/payments"
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">₫</span>
            Giao dịch thanh toán
          </NavLink>

          <NavLink
            to="/admin/poi-owners"
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">♧</span>
            Duyệt hồ sơ POI
          </NavLink>

          <NavLink
            to="/admin/contents"
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">✎</span>
            Quản lý thuyết minh
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `admin-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="admin-nav-symbol">♙</span>
            Quản lý người dùng
          </NavLink>
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
            Quản trị <span>/</span> <strong>{pageTitle}</strong>
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
        {currentPage === "dashboard" && (
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
              onClick={() => {
                void loadStats();
                void loadOverviewCounts();
                void loadActiveVisitors();
              }}
              disabled={loading || overviewCountsLoading}
            >
              <span
                className={
                  loading ? "admin-refresh-icon spinning" : "admin-refresh-icon"
                }
              >
                ↻
              </span>
              {loading || overviewCountsLoading ? "Đang tải..." : "Làm mới dữ liệu"}
            </button>
          </section>
        )}
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
        {currentPage === "dashboard" && overviewCountsError && (
          <div className="admin-alert" role="alert">
            <strong>Không tải được số liệu người dùng</strong>
            <span>{overviewCountsError}</span>
            <button type="button" onClick={() => void loadOverviewCounts()}>
              Thử lại
            </button>
          </div>
        )}

        {/* Bốn thẻ thống kê lượt truy cập */}
        {currentPage === "dashboard" && (
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
            <StatCard
              icon="●"
              tone="green"
              label="Khách đã thanh toán đang truy cập"
              value={activeVisitors}
              hint={activeVisitorsError ? "Không thể cập nhật" : "Đang cập nhật trực tiếp"}
            />
            <StatCard
              icon="₫"
              tone="purple"
              label="Tổng thu nhập"
              value={stats.totalIncome}
              hint={`${formatNumber(stats.paidTransactions)} giao dịch đã thanh toán · VNĐ`}
            />
            <StatCard
              icon="♙"
              tone="blue"
              label="Tổng số người dùng"
              value={overviewCountsLoading ? "…" : formatNumber(overviewCounts.users)}
              hint="Không tính tài khoản Admin"
            />
            <StatCard
              icon="⌖"
              tone="orange"
              label="Yêu cầu duyệt POI"
              value={overviewCountsLoading ? "…" : formatNumber(overviewCounts.poiRequests)}
              hint="Hồ sơ đang chờ xử lý"
            />
            <StatCard
              icon="₫"
              tone="green"
              label="Yêu cầu thanh toán tiền mặt"
              value={overviewCountsLoading ? "…" : formatNumber(overviewCounts.cashPayments)}
              hint="Giao dịch đang chờ xác nhận"
            />
          </section>
        )}
        {currentPage === "visits" && (
          <>
            <section className="admin-page-heading visits-page-heading">
              <div>
                <p className="admin-eyebrow">PHÂN TÍCH TRUY CẬP</p>
                <h1>Thống kê truy cập</h1>
                <p className="admin-subtitle">
                  Theo dõi lượt truy cập, khách duy nhất và khách đang hoạt động.
                </p>
              </div>
              <button
                className="admin-refresh"
                type="button"
                onClick={() => {
                  void loadStats();
                  void loadActiveVisitors();
                }}
                disabled={loading}
              >
                {loading ? "Đang cập nhật..." : "Làm mới thống kê"}
              </button>
            </section>
            <section className="admin-stats-grid visits-stats-grid" aria-label="Thống kê truy cập">
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
              <StatCard
                icon="●"
                tone="green"
                label="Khách đang hoạt động"
                value={activeVisitors}
                hint={activeVisitorsError ? "Không thể cập nhật" : "Cập nhật trực tiếp"}
              />
            </section>
            <VisitorLog token={token} />
          </>
        )}

        {currentPage === "visits" && <VisitorQrCard />}

        {currentPage === "payments" && <CashPaymentManager token={token} />}

        {currentPage === "users" && <UserAccountManager token={token} />}

        {/* Hai bảng tổng quan và trạng thái API */}
        {currentPage === "dashboard" && <section className="admin-content-grid">
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
        </section>}

        {currentPage === "contents" && (
          <ContentManager token={token} />
        )}
        {/* Khu vực duyệt/từ chối hồ sơ POI; truyền JWT xuống component */}
        {currentPage === "poi-owners" && (
          <PoiApplications token={token} />
        )}
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
