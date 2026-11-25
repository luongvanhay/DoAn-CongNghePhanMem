import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock3, RefreshCw, Server } from "lucide-react";
import "./MonitoringDashboard.css";

const POLL_INTERVAL_MS = 15_000;
const VISITS_URL = "/api/content/visits/stats";
const PAYMENTS_URL = "/api/content/payments/stats";
const SERVICES = [
  { name: "API Gateway", url: "/health" },
  { name: "Auth service", url: "/api/auth/health" },
  { name: "Content service", url: "/api/content/health" },
  { name: "Translation service", url: "/api/translation/health" },
  { name: "TTS service", url: "/api/tts/health" },
];

async function probeService(service) {
  const startedAt = performance.now();
  try {
    const response = await fetch(service.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    return {
      ...service,
      status: response.ok ? "online" : "error",
      latencyMs,
      detail: response.ok ? "Hoạt động" : `HTTP ${response.status}`,
    };
  } catch {
    return {
      ...service,
      status: "offline",
      latencyMs: null,
      detail: "Không phản hồi",
    };
  }
}

function Metric({ icon: Icon, label, value, hint, tone }) {
  return (
    <article className="monitor-metric">
      <span className={`monitor-metric-icon ${tone}`}><Icon size={19} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

export default function MonitoringDashboard({ token }) {
  const [services, setServices] = useState([]);
  const [visits, setVisits] = useState(null);
  const [failedPayments, setFailedPayments] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const healthPromise = Promise.all(SERVICES.map(probeService));
    const statsPromise = (async () => {
      const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
      const [visitsResponse, paymentsResponse] = await Promise.all([
        fetch(VISITS_URL, { headers }),
        fetch(PAYMENTS_URL, { headers }),
      ]);
      const [visitData, paymentData] = await Promise.all([
        visitsResponse.json(),
        paymentsResponse.json(),
      ]);
      if (!visitsResponse.ok || !paymentsResponse.ok) {
        throw new Error("Không thể tải thống kê truy cập hoặc thanh toán.");
      }
      return { visitData, paymentData };
    })();

    const [healthResult, statsResult] = await Promise.allSettled([healthPromise, statsPromise]);
    if (healthResult.status === "fulfilled") setServices(healthResult.value);
    if (statsResult.status === "fulfilled") {
      setVisits(statsResult.value.visitData);
      setFailedPayments(statsResult.value.paymentData.failedTransactions ?? 0);
      setStatsError("");
    } else {
      setStatsError(statsResult.reason?.message || "Không tải được số liệu giám sát.");
    }
    setRefreshedAt(new Date());
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    const initialTimerId = window.setTimeout(() => void refresh(), 0);
    const timerId = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(timerId);
    };
  }, [refresh]);

  const onlineServices = services.filter((service) => service.status === "online").length;
  const measuredLatencies = services
    .filter((service) => service.status === "online" && service.latencyMs != null)
    .map((service) => service.latencyMs);
  const averageLatency = measuredLatencies.length
    ? Math.round(measuredLatencies.reduce((sum, latency) => sum + latency, 0) / measuredLatencies.length)
    : null;

  return (
    <div className="monitoring-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">TÌNH TRẠNG HỆ THỐNG</p>
          <h1>Dashboard giám sát</h1>
          <p className="admin-subtitle">Health service, lượt truy cập, thanh toán lỗi và độ trễ API.</p>
        </div>
        <button className="admin-refresh" type="button" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "monitor-spin" : ""} />
          {refreshing ? "Đang cập nhật…" : "Làm mới"}
        </button>
      </section>

      {statsError && <div className="admin-alert" role="alert"><strong>Lỗi tải thống kê</strong><span>{statsError}</span></div>}

      <section className="monitor-metrics" aria-label="Chỉ số giám sát">
        <Metric icon={Server} tone="blue" label="Service hoạt động" value={`${onlineServices}/${SERVICES.length}`} hint="Health check trực tiếp" />
        <Metric icon={Activity} tone="purple" label="Lượt truy cập hôm nay" value={visits?.visitsToday?.toLocaleString("vi-VN") ?? "—"} hint={`Tổng cộng ${visits?.totalVisits?.toLocaleString("vi-VN") ?? "—"} lượt`} />
        <Metric icon={AlertTriangle} tone="orange" label="Thanh toán thất bại" value={failedPayments?.toLocaleString("vi-VN") ?? "—"} hint="Tổng giao dịch trạng thái FAILED" />
        <Metric icon={Clock3} tone="green" label="Độ trễ trung bình" value={averageLatency == null ? "—" : `${averageLatency} ms`} hint="Trung bình các health probe thành công" />
      </section>

      <section className="monitor-panel">
        <header className="monitor-panel-heading">
          <div><h2>Trạng thái dịch vụ</h2><p>Độ trễ đo từ trình duyệt quản trị tới từng endpoint.</p></div>
          <span className="monitor-updated">{refreshedAt ? `Cập nhật ${refreshedAt.toLocaleTimeString("vi-VN")}` : "Đang kết nối…"}</span>
        </header>
        <div className="monitor-table-wrap">
          <table className="monitor-table">
            <thead><tr><th>Dịch vụ</th><th>Trạng thái</th><th>Thời gian phản hồi</th><th>Endpoint</th></tr></thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.name}>
                  <td className="monitor-service-name"><span className={`monitor-status-dot ${service.status}`} />{service.name}</td>
                  <td><span className={`monitor-status-pill ${service.status}`}>{service.detail}</span></td>
                  <td>{service.latencyMs == null ? "—" : `${service.latencyMs} ms`}</td>
                  <td><code>{service.url}</code></td>
                </tr>
              ))}
              {services.length === 0 && <tr><td colSpan="4">Đang kiểm tra service…</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="monitor-footnote">Tự động cập nhật mỗi 15 giây. Thời gian phản hồi là RTT từ trình duyệt, không phải latency đo bên trong service.</p>
      </section>
    </div>
  );
}
