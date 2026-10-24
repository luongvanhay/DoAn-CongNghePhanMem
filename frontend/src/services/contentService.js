const API_BASE_URL = "/api/content";

// Lấy danh sách địa điểm
export async function getContents() {
  const response = await fetch(`${API_BASE_URL}/contents`);

  if (!response.ok) {
    throw new Error(`Lỗi API: ${response.status}`);
  }

  return response.json();
}

// Lấy hoặc tạo mã nhận diện trình duyệt
function getVisitorId() {
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

// Ghi nhận một lượt truy cập trong mỗi phiên tab
export async function recordVisit() {
  if (sessionStorage.getItem("visitRecorded")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/visits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitorId: getVisitorId(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Lỗi ghi nhận lượt truy cập: ${response.status}`);
    }

    // Chỉ đánh dấu sau khi API ghi nhận thành công
    sessionStorage.setItem("visitRecorded", "1");
  } catch (error) {
    console.error("Không thể ghi nhận lượt truy cập:", error);
  }
}
