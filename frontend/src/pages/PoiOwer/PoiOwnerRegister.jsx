import { useState } from "react";
import { Link } from "react-router-dom";
import "./PoiOwnerRegister.css";

const API_URL = "/api/auth/poi-owner/applications";

const INITIAL_FORM = {
  username: "",
  password: "",
  businessName: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  description: "",
};

export default function PoiOwnerRegister() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (form.phone.trim().length < 9) {
      setError("Vui lòng kiểm tra số điện thoại.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          username: form.username.trim(),
          businessName: form.businessName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Không thể gửi hồ sơ. Vui lòng kiểm tra thông tin.",
        );
      }

      setSuccess({
        applicationId: data.applicationId,
        businessName: data.businessName || form.businessName,
        status: data.status || "PENDING",
      });

      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="poi-register-page">
        <section className="poi-register-card poi-register-success">
          <div className="poi-success-icon" aria-hidden="true">
            ✓
          </div>

          <h1>Đã gửi hồ sơ đăng ký!</h1>

          <p>
            Hồ sơ của cơ sở <strong>{success.businessName}</strong> đã được gửi
            thành công.
          </p>

          <div className="poi-status">
            <span>Trạng thái hồ sơ</span>
            <strong>Đang chờ Admin duyệt</strong>
          </div>

          {success.applicationId && (
            <p className="poi-application-id">
              Mã hồ sơ: {success.applicationId}
            </p>
          )}

          <p className="poi-register-note">
            Bạn chưa thể sử dụng các chức năng dành cho chủ địa điểm cho đến khi
            hồ sơ được phê duyệt.
          </p>

          <div className="poi-register-actions">
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="poi-button poi-button-primary"
            >
              Đăng ký hồ sơ khác
            </button>

            <Link to="/" className="poi-button poi-button-secondary">
              Về trang chủ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="poi-register-page">
      <section className="poi-register-card">
        <header className="poi-register-header">
          <p className="poi-register-eyebrow">DÀNH CHO CHỦ ĐỊA ĐIỂM</p>
          <h1>Đăng ký cơ sở kinh doanh</h1>
          <p>
            Điền thông tin để gửi hồ sơ. Admin sẽ xem xét trước khi kích hoạt
            quyền quản lý địa điểm.
          </p>
        </header>

        {error && (
          <div className="poi-register-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="poi-register-form">
          <h2>Thông tin tài khoản</h2>

          <div className="poi-form-grid">
            <label className="poi-field">
              Tên đăng nhập <span>*</span>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
                placeholder="Nhập tên đăng nhập"
              />
            </label>

            <label className="poi-field">
              Mật khẩu <span>*</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Ít nhất 8 ký tự"
              />
            </label>
          </div>

          <h2>Thông tin cơ sở</h2>

          <div className="poi-form-grid">
            <label className="poi-field">
              Tên cơ sở <span>*</span>
              <input
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Ví dụ: Quán cà phê ABC"
              />
            </label>

            <label className="poi-field">
              Người liên hệ <span>*</span>
              <input
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Họ và tên người đại diện"
              />
            </label>

            <label className="poi-field">
              Số điện thoại <span>*</span>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
                placeholder="Nhập số điện thoại"
              />
            </label>

            <label className="poi-field">
              Email <span>*</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                placeholder="example@email.com"
              />
            </label>
          </div>

          <label className="poi-field">
            Địa chỉ cơ sở <span>*</span>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              autoComplete="street-address"
              required
              maxLength={250}
              placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
            />
          </label>

          <label className="poi-field">
            Mô tả cơ sở
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              maxLength={2000}
              placeholder="Giới thiệu ngắn về cơ sở của bạn (không bắt buộc)"
            />
          </label>

          <p className="poi-required-note">
            Các trường có dấu <span>*</span> là bắt buộc.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="poi-button poi-button-primary poi-submit-button"
          >
            {loading ? "Đang gửi hồ sơ..." : "Gửi hồ sơ đăng ký"}
          </button>
        </form>

        <footer className="poi-register-footer">
          Bạn chỉ muốn tham quan?{" "}
          <Link to="/">Quay về trang khách tham quan</Link>
        </footer>
      </section>
    </main>
  );
}
