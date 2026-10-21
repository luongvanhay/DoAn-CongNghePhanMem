const API_BASE_URL = "http://localhost:3000/content";

export async function getContents() {
  const response = await fetch(`${API_BASE_URL}/contents`);

  if (!response.ok) {
    throw new Error(`Lỗi API: ${response.status}`);
  }

  return response.json();
}
