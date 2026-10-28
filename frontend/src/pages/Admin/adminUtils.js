export function formatNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("vi-VN").format(number)
    : "—";
}

export async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
    );
  }

  return data;
}
