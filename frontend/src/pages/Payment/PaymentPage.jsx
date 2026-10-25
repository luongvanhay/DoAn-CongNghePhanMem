import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { languages, supportedLanguageCodes } from "../../i18n";
import "./PaymentPage.css";

const TICKET_PRICE = 50000;
const PAYMENT_WINDOW_SECONDS = 15 * 60;

function getCheckoutLanguage() {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  return supportedLanguageCodes.has(requestedLanguage) ? requestedLanguage : "vi";
}

export default function PaymentPage() {
  const language = getCheckoutLanguage();
  const selectedLanguage = languages.find((item) => item.code === language);
  const [transactionCode, setTransactionCode] = useState("");
  const [method, setMethod] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createQrPayment() {
    setLoading(true);
    setMessage("");
    setPaymentUrl("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: TICKET_PRICE,
          method: "VNPAY",
          language,
          source: new URLSearchParams(window.location.search).get("source"),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo mã QR thanh toán.");
      }
      if (!data.transactionCode || !data.paymentUrl) {
        throw new Error("Máy chủ chưa trả về đủ thông tin thanh toán.");
      }

      const expiration = data.expiresAt
        ? new Date(data.expiresAt).toISOString()
        : new Date(Date.now() + PAYMENT_WINDOW_SECONDS * 1000).toISOString();
      setTransactionCode(data.transactionCode);
      setMethod("online");
      setPaymentUrl(data.paymentUrl);
      setExpiresAt(expiration);
      setRemainingSeconds(PAYMENT_WINDOW_SECONDS);
      setStatus("pending");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Không thể kết nối máy chủ thanh toán.");
    } finally {
      setLoading(false);
    }
  }

  async function createCashPayment() {
    setLoading(true);
    setMessage("");
    setClaimCode("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: TICKET_PRICE,
          method: "CASH",
          language,
          source: new URLSearchParams(window.location.search).get("source"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo giao dịch tiền mặt.");
      }

      setTransactionCode(data.transactionCode);
      setMethod("cash");
      setStatus("pending");
      setMessage(
        "Đưa mã giao dịch cho nhân viên và thanh toán 50.000 đồng. Sau khi nhân viên xác nhận, hãy nhập mã xác nhận được cung cấp.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Không thể kết nối máy chủ thanh toán.");
    } finally {
      setLoading(false);
    }
  }

  async function submitClaimCode(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode: claimCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Không thể xác thực mã xác nhận.");
      }

      setStatus("success");
      setMessage(
        data.message || "Xác thực thành công. Bạn có thể vào trang tham quan.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Không thể xác thực mã xác nhận.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const returnedTransactionCode = new URLSearchParams(
      window.location.search,
    ).get("transactionCode");
    if (!returnedTransactionCode) {
      return undefined;
    }

    let cancelled = false;

    async function loadReturnedPayment() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/payments/${encodeURIComponent(returnedTransactionCode)}`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Không thể kiểm tra giao dịch.");
        }
        if (cancelled) {
          return;
        }

        setTransactionCode(data.transactionCode);
        setMethod(data.method === "VNPAY" ? "online" : "cash");
        if (data.status === "PAID" && data.accessGranted) {
          setStatus("success");
          setMessage("Thanh toán thành công. Bạn có thể vào trang tham quan.");
        } else if (data.status === "FAILED") {
          setStatus("error");
          setMessage("Giao dịch chưa hoàn tất hoặc đã bị hủy.");
        } else {
          setStatus("pending");
          setMessage("Đang chờ VNPay xác nhận giao dịch của bạn.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error.message || "Không thể kiểm tra giao dịch.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReturnedPayment();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (method !== "online" || status !== "pending" || !transactionCode) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId;

    async function checkPayment() {
      try {
        const response = await fetch(
          `/api/payments/${encodeURIComponent(transactionCode)}`,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Không thể kiểm tra giao dịch.");
        }
        if (cancelled) {
          return;
        }

        if (data.status === "PAID" && data.accessGranted) {
          setStatus("success");
          setMessage("Thanh toán thành công. Bạn có thể vào trang tham quan.");
          return;
        }
        if (data.status === "FAILED") {
          setStatus("error");
          setMessage("Giao dịch chưa hoàn tất hoặc đã bị hủy.");
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error.message || "Không thể kiểm tra trạng thái thanh toán.",
          );
        }
      }

      if (!cancelled) {
        timeoutId = window.setTimeout(checkPayment, 3000);
      }
    }

    timeoutId = window.setTimeout(checkPayment, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [method, status, transactionCode]);

  useEffect(() => {
    if (status !== "pending" || !expiresAt) {
      return undefined;
    }

    function updateCountdown() {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setStatus("expired");
        setMessage("Mã thanh toán đã hết hạn. Hãy tạo mã QR mới.");
      }
    }

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt, status]);

  function continueToVisitorSite() {
    sessionStorage.setItem("visitorPaid", "1");
    const visitorUrl = new URL("/", window.location.origin);
    visitorUrl.searchParams.set("lang", language);
    if (new URLSearchParams(window.location.search).get("source") === "qr") {
      visitorUrl.searchParams.set("source", "qr");
    }
    window.location.assign(visitorUrl);
  }

  function formatRemainingTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <div className="payment-brand">
          <div className="payment-brand-icon">
            <MapPin size={23} />
          </div>
          <div>
            <strong>Chùa Linh Ứng</strong>
            <span>HỆ THỐNG THAM QUAN</span>
          </div>
        </div>
        <span className="payment-secure">
          <ShieldCheck size={16} />
          Thanh toán an toàn
        </span>
      </header>

      <section className="payment-container">
        <div className="payment-intro">
          <div className="payment-qr-icon">
            <QrCode size={30} />
          </div>
          <p className="payment-eyebrow">CHÀO MỪNG QUÝ KHÁCH</p>
          <h1>Đăng ký quyền tham quan</h1>
          <p>
            Vui lòng chọn phương thức thanh toán để sử dụng bản đồ tham quan và
            khám phá các địa điểm tại Chùa Linh Ứng.
          </p>
          <p className="payment-price">
            Giá vé: <strong>50.000 đồng/lượt</strong>
          </p>
        </div>

        <section className="payment-card">
          {status === "success" ? (
            <div className="payment-success">
              <CheckCircle2 size={48} />
              <h2>Thanh toán thành công</h2>
              <p>{message}</p>
              <button
                type="button"
                className="payment-primary-button"
                onClick={continueToVisitorSite}
              >
                Vào trang tham quan
              </button>
            </div>
          ) : (
            <>
              <h2>Chọn phương thức thanh toán</h2>
              <p className="payment-description">
                Chọn một trong hai hình thức bên dưới.
              </p>

              <div className="payment-method-options">
                <button
                  type="button"
                  className={`payment-option ${method === "online" ? "selected" : ""}`}
                  onClick={() => setMethod("online")}
                  disabled={loading || Boolean(transactionCode)}
                >
                  <span className="payment-option-icon online">
                    <CreditCard size={22} />
                  </span>
                  <span className="payment-option-text">
                    <strong>Thanh toán trực tuyến</strong>
                    <span>Quét QR ngân hàng qua cổng VNPay</span>
                  </span>
                  <span className="payment-radio">{method === "online" ? "✓" : ""}</span>
                </button>
                <button
                  type="button"
                  className={`payment-option ${method === "cash" ? "selected" : ""}`}
                  onClick={() => setMethod("cash")}
                  disabled={loading || Boolean(transactionCode)}
                >
                  <span className="payment-option-icon cash">
                    <Banknote size={22} />
                  </span>
                  <span className="payment-option-text">
                    <strong>Thanh toán tiền mặt</strong>
                    <span>Nhận mã xác nhận từ nhân viên</span>
                  </span>
                  <span className="payment-radio">{method === "cash" ? "✓" : ""}</span>
                </button>
              </div>

              {method === "online" && (
                <>
                  <p className="payment-description">
                    Quét mã bằng ứng dụng ngân hàng hỗ trợ VNPay QR. Chỉ giao dịch
                    được máy chủ xác nhận mới mở quyền truy cập.
                  </p>
                  {status === "pending" && paymentUrl ? (
                    <div className="payment-qr-panel">
                      <div className="payment-qr-frame">
                        <QRCodeSVG
                          value={paymentUrl}
                          size={228}
                          level="M"
                          includeMargin
                          title={`Mã thanh toán VNPay ${transactionCode}`}
                        />
                      </div>
                      <strong className="payment-qr-amount">50.000 đồng</strong>
                      <p className="payment-qr-instructions">
                        Dùng camera điện thoại quét mã để mở trang thanh toán VNPay,
                        sau đó chọn ngân hàng được hỗ trợ.
                      </p>
                      <p className="payment-qr-expiry">
                        Mã hết hạn sau{" "}
                        <strong>{formatRemainingTime(remainingSeconds)}</strong>
                      </p>
                      <p className="payment-transaction-code">
                        Mã giao dịch: <strong>{transactionCode}</strong>
                      </p>
                      <a
                        className="payment-same-device-link"
                        href={paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={15} />
                        Thanh toán trên thiết bị này
                      </a>
                      <p className="payment-poll-status">
                        Đang tự động kiểm tra trạng thái thanh toán…
                      </p>
                    </div>
                  ) : (
                    <div className="payment-action-panel">
                      <p>
                        Ngôn ngữ: <strong>{selectedLanguage?.nativeName}</strong>
                        {" · "}Số tiền: <strong>50.000 đồng</strong>
                      </p>
                      <button
                        type="button"
                        className="payment-primary-button"
                        onClick={createQrPayment}
                        disabled={loading}
                      >
                        {loading ? "Đang tạo giao dịch..." : "Tạo mã QR thanh toán"}
                      </button>
                    </div>
                  )}
                  {message && status !== "pending" && (
                    <div className="payment-message" role="alert">
                      <span>{message}</span>
                    </div>
                  )}
                  {status === "expired" && (
                    <button
                      type="button"
                      className="payment-primary-button"
                      onClick={createQrPayment}
                      disabled={loading}
                    >
                      <RefreshCw size={16} />
                      Tạo mã QR mới
                    </button>
                  )}
                </>
              )}

              {method === "cash" && (
                <div className="payment-action-panel">
                  {!transactionCode ? (
                    <>
                      <p>
                        Tạo giao dịch trước, sau đó đưa mã giao dịch cho nhân viên
                        tại điểm tham quan.
                      </p>
                      <button
                        type="button"
                        className="payment-primary-button"
                        onClick={createCashPayment}
                        disabled={loading}
                      >
                        {loading ? "Đang tạo giao dịch..." : "Tạo giao dịch tiền mặt"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Mã giao dịch của bạn:</p>
                      <strong className="payment-transaction-code-value">{transactionCode}</strong>
                      <p>
                        Số tiền cần thanh toán: <strong>50.000 đồng</strong>
                      </p>
                      <p>
                        Sau khi nhân viên xác nhận đã thu tiền, hãy nhập Claim code
                        mà nhân viên cung cấp.
                      </p>
                      <form className="payment-claim-form" onSubmit={submitClaimCode}>
                        <label htmlFor="claim-code">Mã xác nhận (Claim code)</label>
                        <input
                          id="claim-code"
                          value={claimCode}
                          onChange={(event) => setClaimCode(event.target.value)}
                          autoComplete="off"
                          disabled={loading}
                          placeholder="Nhập mã do nhân viên cung cấp"
                        />
                        <button
                          type="submit"
                          className="payment-primary-button"
                          disabled={loading || !claimCode.trim()}
                        >
                          {loading ? "Đang xác thực..." : "Xác thực mã"}
                        </button>
                      </form>
                    </>
                  )}
                  {message && (
                    <div className="payment-message" role="alert">
                      <span>{message}</span>
                    </div>
                  )}
                </div>
              )}

              {!method && (
                <div className="payment-action-panel">
                  <p>Vui lòng chọn phương thức thanh toán ở trên.</p>
                </div>
              )}
            </>
          )}

          <div className="payment-note">
            <ShieldCheck size={18} />
            <span>
              Thanh toán online được xác nhận tự động; thanh toán tiền mặt chỉ
              được cấp quyền sau khi máy chủ xác minh giao dịch đã thanh toán và
              Claim code hợp lệ.
            </span>
          </div>
        </section>

        <button
          type="button"
          className="payment-back-button"
          onClick={() => {
            window.location.assign("/");
          }}
        >
          <ArrowLeft size={17} />
          Quay lại bản đồ
        </button>
      </section>
      <footer className="payment-footer">
        © {new Date().getFullYear()} Chùa Linh Ứng · Hệ thống tham quan
      </footer>
    </main>
  );
}
