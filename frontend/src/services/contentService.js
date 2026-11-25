const API_BASE_URL = "/api/content";

export async function uploadPoiImage(file, token) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ảnh không được lớn hơn 8 MB.");
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPEG hoặc PNG.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/contents/images`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  const data = (() => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  })();

  if (!response.ok || !data.imageUrl) {
    throw new Error(
      data.message || `Tải ảnh lên thất bại (${response.status}).`,
    );
  }

  return data.imageUrl;
}

// Lấy danh sách địa điểm
export async function getContents() {
  const response = await fetch(`${API_BASE_URL}/contents`);

  if (!response.ok) {
    throw new Error(`Lỗi API: ${response.status}`);
  }

  return response.json();
}

// Lấy hoặc tạo mã nhận diện ẩn danh của trình duyệt
export function getVisitorId() {
  let id = localStorage.getItem("visitorId");

  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);

    localStorage.setItem("visitorId", id);
  }

  return id;
}

export function getVisitSessionId() {
  let id = sessionStorage.getItem("visitSessionId");

  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);

    sessionStorage.setItem("visitSessionId", id);
  }

  return id;
}

export async function recordActivePresence(language = "") {
  try {
    await fetch(`${API_BASE_URL}/visits/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getVisitSessionId(),
        source: new URLSearchParams(window.location.search).get("source") === "qr" ? "qr" : "direct",
        language,
      }),
    });
  } catch (error) {
    console.error("Khong the cap nhat hien dien:", error);
  }
}

// Lưu một lượt truy cập theo tab và cập nhật ngôn ngữ đã chọn.
export async function recordVisit(language = "") {
  try {
    const response = await fetch(`${API_BASE_URL}/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        sessionId: getVisitSessionId(),
        source: new URLSearchParams(window.location.search).get("source") === "qr"
          ? "qr"
          : "direct",
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Lỗi ghi nhận lượt truy cập: ${response.status}`);
    }

  } catch (error) {
    console.error("Không thể ghi nhận lượt truy cập:", error);
  }
}
