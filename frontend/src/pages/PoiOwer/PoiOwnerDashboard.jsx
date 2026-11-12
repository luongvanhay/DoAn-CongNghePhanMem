import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  LogOut,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Search,
  MapPinned,
} from "lucide-react";
import "./PoiOwnerDashboard.css";

const API_URL = "/api/content/contents";

const EMPTY_FORM = {
  title: "",
  body: "",
  location: "",
  sourceLanguage: "vi",
  latitude: "",
  longitude: "",
  triggerRadius: 30,
  imageUrl: "",
  audioPriority: 0,
  active: true,
};

function getErrorMessage(data, fallback) {
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item.defaultMessage || item.message)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

export default function PoiOwnerDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toUpperCase();

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (role !== "PROVIDER") {
      if (role === "ADMIN" || role === "ADMINSTAFF") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [navigate]);

  const username = localStorage.getItem("username") || "Chủ địa điểm";
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const request = useCallback(
    async (path, options = {}) => {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        navigate("/login", { replace: true });
        throw new Error("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(path, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      const text = await response.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text ? { message: text } : null;
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          localStorage.removeItem("role");
          navigate("/login", { replace: true });
        }

        throw new Error(
          getErrorMessage(data, `Yêu cầu thất bại (${response.status})`),
        );
      }

      return data;
    },
    [navigate],
  );

  const loadPlaces = useCallback(async () => {
    try {
      const data = await request(`${API_URL}/mine`);
      setPlaces(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách địa điểm.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  function refreshPlaces() {
    setLoading(true);
    setError("");
    void loadPlaces();
  }

  function openCreateForm() {
    setEditingId("");
    setForm({ ...EMPTY_FORM });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(place) {
    setEditingId(place.id);
    setForm({
      title: place.title || "",
      body: place.body || "",
      location: place.location || "",
      sourceLanguage: place.sourceLanguage || "vi",
      latitude: place.latitude ?? "",
      longitude: place.longitude ?? "",
      triggerRadius: place.triggerRadius ?? 30,
      imageUrl: place.imageUrl || "",
      audioPriority: place.audioPriority ?? 0,
      active: place.active ?? true,
    });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function toPayload() {
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      location: form.location.trim() || null,
      sourceLanguage: form.sourceLanguage.trim().toLowerCase(),
      triggerRadius: Number(form.triggerRadius),
      imageUrl: form.imageUrl.trim() || null,
      audioPriority: Number(form.audioPriority),
      active: form.active,
    };

    if (form.latitude !== "") {
      payload.latitude = Number(form.latitude);
    }

    if (form.longitude !== "") {
      payload.longitude = Number(form.longitude);
    }

    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (
        !form.title.trim() ||
        !form.body.trim() ||
        !form.sourceLanguage.trim()
      ) {
        throw new Error("Vui lòng nhập tiêu đề, nội dung và ngôn ngữ gốc.");
      }

      if ((form.latitude === "") !== (form.longitude === "")) {
        throw new Error("Hãy nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.");
      }

      if (
        form.latitude !== "" &&
        (Number(form.latitude) < -90 || Number(form.latitude) > 90)
      ) {
        throw new Error("Vĩ độ phải nằm trong khoảng -90 đến 90.");
      }

      if (
        form.longitude !== "" &&
        (Number(form.longitude) < -180 || Number(form.longitude) > 180)
      ) {
        throw new Error("Kinh độ phải nằm trong khoảng -180 đến 180.");
      }

      if (
        !Number.isInteger(Number(form.triggerRadius)) ||
        Number(form.triggerRadius) < 1
      ) {
        throw new Error("Bán kính kích hoạt phải là số nguyên lớn hơn 0.");
      }

      if (
        !Number.isInteger(Number(form.audioPriority)) ||
        Number(form.audioPriority) < 0
      ) {
        throw new Error("Độ ưu tiên phải là số nguyên không âm.");
      }

      const url = editingId
        ? `${API_URL}/${encodeURIComponent(editingId)}`
        : API_URL;

      await request(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(toPayload()),
      });

      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditingId("");
      setNotice(editingId ? "Đã cập nhật địa điểm." : "Đã thêm địa điểm.");
      await loadPlaces();
    } catch (err) {
      setError(err.message || "Không thể lưu địa điểm.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(place) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa địa điểm "${place.title}" không?`,
    );

    if (!confirmed) return;

    setDeletingId(place.id);
    setError("");
    setNotice("");

    try {
      await request(`${API_URL}/${encodeURIComponent(place.id)}`, {
        method: "DELETE",
      });

      setNotice("Đã xóa địa điểm.");
      await loadPlaces();
    } catch (err) {
      setError(err.message || "Không thể xóa địa điểm.");
    } finally {
      setDeletingId("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }

  const filteredPlaces = places.filter((place) => {
    const searchText = `${place.title || ""} ${place.location || ""} ${place.body || ""}`;
    return searchText.toLowerCase().includes(keyword.toLowerCase().trim());
  });

  return (
    <main className="owner-page">
      <header className="owner-header">
        <div className="owner-brand">
          <MapPin size={28} />
          <span>VietPlace</span>
        </div>

        <div className="owner-account">
          <span>
            Xin chào, <strong>{username}</strong>
          </span>
          <button className="owner-logout" onClick={handleLogout}>
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </header>

      <section className="owner-content">
        <div className="owner-heading">
          <div>
            <p className="owner-eyebrow">TRANG QUẢN TRỊ NHÀ CUNG CẤP</p>
            <h1>Quản lý địa điểm</h1>
            <p className="owner-subtitle">
              Quản lý thông tin các địa điểm do bạn đăng ký.
            </p>
          </div>

          <button className="owner-primary-btn" onClick={openCreateForm}>
            <Plus size={19} />
            Thêm địa điểm
          </button>
        </div>

        <div className="owner-stats">
          <div className="owner-stat-card">
            <span className="owner-stat-icon">
              <MapPinned size={22} />
            </span>
            <div>
              <p>Tổng số địa điểm</p>
              <strong>{places.length}</strong>
            </div>
          </div>

          <div className="owner-stat-card">
            <span className="owner-stat-icon owner-stat-green">
              <MapPin size={22} />
            </span>
            <div>
              <p>Đang hoạt động</p>
              <strong>
                {places.filter((place) => place.active !== false).length}
              </strong>
            </div>
          </div>
        </div>

        {notice && <div className="owner-alert owner-success">{notice}</div>}
        {error && <div className="owner-alert owner-error">{error}</div>}

        <section className="owner-list-panel">
          <div className="owner-list-heading">
            <div>
              <h2>Địa điểm của tôi</h2>
              <p>Danh sách địa điểm thuộc tài khoản của bạn.</p>
            </div>

            <button
              className="owner-secondary-btn"
              onClick={refreshPlaces}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
          </div>

          <label className="owner-search">
            <Search size={18} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc địa chỉ..."
            />
          </label>

          {loading ? (
            <div className="owner-empty">Đang tải danh sách địa điểm...</div>
          ) : filteredPlaces.length === 0 ? (
            <div className="owner-empty">
              <MapPin size={34} />
              <h3>
                {keyword
                  ? "Không tìm thấy địa điểm"
                  : "Bạn chưa có địa điểm nào"}
              </h3>
              <p>
                {keyword
                  ? "Thử nhập từ khóa khác."
                  : "Nhấn “Thêm địa điểm” để tạo địa điểm đầu tiên."}
              </p>
              {!keyword && (
                <button className="owner-primary-btn" onClick={openCreateForm}>
                  <Plus size={18} /> Thêm địa điểm
                </button>
              )}
            </div>
          ) : (
            <div className="owner-place-grid">
              {filteredPlaces.map((place) => (
                <article className="owner-place-card" key={place.id}>
                  {place.imageUrl ? (
                    <img
                      className="owner-place-image"
                      src={place.imageUrl}
                      alt={place.title}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="owner-place-placeholder">
                      <MapPin size={34} />
                    </div>
                  )}

                  <div className="owner-place-body">
                    <div className="owner-place-title-row">
                      <h3>{place.title}</h3>
                      <span
                        className={`owner-status ${place.active === false ? "inactive" : "active"}`}
                      >
                        {place.active === false ? "Tạm ngưng" : "Hoạt động"}
                      </span>
                    </div>

                    <p className="owner-place-location">
                      <MapPin size={15} />
                      {place.location || "Chưa có địa chỉ"}
                    </p>

                    <p className="owner-place-description">{place.body}</p>

                    {place.latitude != null && place.longitude != null && (
                      <p className="owner-coordinates">
                        GPS: {place.latitude}, {place.longitude}
                      </p>
                    )}

                    <div className="owner-place-actions">
                      <button
                        className="owner-edit-btn"
                        onClick={() => openEditForm(place)}
                      >
                        <Pencil size={15} /> Chỉnh sửa
                      </button>
                      <button
                        className="owner-delete-btn"
                        onClick={() => handleDelete(place)}
                        disabled={deletingId === place.id}
                      >
                        <Trash2 size={15} />
                        {deletingId === place.id ? "Đang xóa..." : "Xóa"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {showForm && (
        <div
          className="owner-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false);
            }
          }}
        >
          <section className="owner-modal" role="dialog" aria-modal="true">
            <div className="owner-modal-heading">
              <div>
                <h2>
                  {editingId ? "Chỉnh sửa địa điểm" : "Thêm địa điểm mới"}
                </h2>
                <p>Nhập thông tin địa điểm bên dưới.</p>
              </div>
              <button
                className="owner-icon-btn"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Đóng"
              >
                <X size={22} />
              </button>
            </div>

            <form className="owner-form" onSubmit={handleSubmit}>
              <label>
                Tiêu đề <span>*</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  maxLength={255}
                  required
                  placeholder="Ví dụ: Bảo tàng lịch sử"
                />
              </label>

              <label>
                Nội dung mô tả <span>*</span>
                <textarea
                  name="body"
                  value={form.body}
                  onChange={updateField}
                  required
                  rows={4}
                  placeholder="Mô tả thông tin, lịch sử hoặc hướng dẫn tham quan..."
                />
              </label>

              <label>
                Địa chỉ
                <input
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  maxLength={255}
                  placeholder="Số nhà, đường, phường/xã..."
                />
              </label>

              <label>
                Ngôn ngữ gốc <span>*</span>
                <select
                  name="sourceLanguage"
                  value={form.sourceLanguage}
                  onChange={updateField}
                  required
                >
                  <option value="vi">Tiếng Việt (vi)</option>
                  <option value="en">Tiếng Anh (en)</option>
                  <option value="fr">Tiếng Pháp (fr)</option>
                  <option value="zh">Tiếng Trung (zh)</option>
                  <option value="ja">Tiếng Nhật (ja)</option>
                  <option value="ko">Tiếng Hàn (ko)</option>
                </select>
              </label>

              <div className="owner-form-two-columns">
                <label>
                  Vĩ độ (latitude)
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={updateField}
                    placeholder="Ví dụ: 10.7626"
                  />
                </label>

                <label>
                  Kinh độ (longitude)
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={updateField}
                    placeholder="Ví dụ: 106.6602"
                  />
                </label>
              </div>

              <label>
                URL hình ảnh
                <input
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={updateField}
                  maxLength={500}
                  placeholder="https://example.com/image.jpg"
                />
              </label>

              <div className="owner-form-two-columns">
                <label>
                  Bán kính kích hoạt (m)
                  <input
                    name="triggerRadius"
                    type="number"
                    min="1"
                    step="1"
                    value={form.triggerRadius}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Độ ưu tiên âm thanh
                  <input
                    name="audioPriority"
                    type="number"
                    min="0"
                    step="1"
                    value={form.audioPriority}
                    onChange={updateField}
                    required
                  />
                </label>
              </div>

              <label className="owner-checkbox-label">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={updateField}
                />
                Địa điểm đang hoạt động
              </label>

              {error && <div className="owner-alert owner-error">{error}</div>}

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-secondary-btn"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="owner-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo địa điểm"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
