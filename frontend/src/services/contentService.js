const API_BASE_URL = "/api/content";

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
