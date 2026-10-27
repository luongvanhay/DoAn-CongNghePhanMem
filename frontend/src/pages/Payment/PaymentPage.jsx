import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { languages, supportedLanguageCodes } from "../../i18n";
import "./PaymentPage.css";

const TICKET_PRICE = 50000;

function getCheckoutLanguage() {
  const requestedLanguage = new URLSearchParams(window.location.search).get(
    "lang",
  );

  return supportedLanguageCodes.has(requestedLanguage)
    ? requestedLanguage
    : "vi";
}

export default function PaymentPage() {
  const language = getCheckoutLanguage();
  const selectedLanguage = languages.find((item) => item.code === language);

  const [transactionCode, setTransactionCode] = useState("");
  const [method, setMethod] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getPaymentSource() {
    return new URLSearchParams(window.location.search).get("source");
  }

  async function createVnpayPayment() {
    setLoading(true);
    setMessage("");
    setClaimCode("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: TICKET_PRICE,
          method: "VNPAY",
          language,
          source: getPaymentSource(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo giao dịch VNPAY.");
      }

      if (!data.transactionCode || !data.paymentUrl) {
        throw new Error("Máy chủ chưa trả về mã giao dịch hoặc URL VNPAY.");
      }

      setTransactionCode(data.transactionCode);
      setMethod("online");

      // Chuyển khách sang trang thanh toán VNPAY Sandbox.
      window.location.assign(data.paymentUrl);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Không thể tạo giao dịch VNPAY.");
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
          source: getPaymentSource(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo giao dịch tiền mặt.");
      }

      if (!data.transactionCode) {
        throw new Error("Máy chủ chưa trả về mã giao dịch.");
      }

      setTransactionCode(data.transactionCode);
      setMethod("cash");
      setStatus("pending");
      setMessage(
        "Đưa mã giao dịch cho nhân viên và thanh toán 50.000 đồng. Sau khi nhân viên xác nhận, hãy nhập mã xác nhận được cung cấp.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Không thể tạo giao dịch tiền mặt.");
    } finally {
      setLoading(false);
    }
  }

  async function completePayooDemoPayment(result) {
    if (!transactionCode || loading || status !== "pending") {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/payments/${encodeURIComponent(transactionCode)}/payoo-demo/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể cập nhật giao dịch Payoo Demo.",
        );
      }

      if (data.status === "PAID" && data.accessGranted) {
        setStatus("success");
        setMessage(data.message || "Thanh toán Payoo Demo thành công.");
      } else if (data.status === "FAILED") {
        setStatus("error");
        setMessage(data.message || "Giao dịch Payoo Demo đã bị hủy.");
      } else {
        setStatus("pending");
        setMessage(data.message || "Giao dịch chưa hoàn tất.");
      }
    } catch (error) {
      setMessage(error.message || "Có lỗi khi xử lý Payoo Demo.");
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
        body: JSON.stringify({
          claimCode: claimCode.trim(),
        }),
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

  function resetPayment() {
    setTransactionCode("");
    setMethod("");
    setClaimCode("");
    setStatus("ready");
    setMessage("");
    setLoading(false);
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

        setMethod(
          data.method === "PAYOO"
            ? "payoo"
            : data.method === "VNPAY"
              ? "online"
              : "cash",
        );

        if (data.status === "PAID" && data.accessGranted) {
          setStatus("success");
          setMessage("Thanh toán thành công. Bạn có thể vào trang tham quan.");
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          setStatus("error");
          setMessage("Giao dịch chưa hoàn tất hoặc đã bị hủy.");
        } else {
          setStatus("pending");
          setMessage(
            data.method === "VNPAY"
              ? "Giao dịch đang được xác nhận. Vui lòng chờ trong giây lát."
              : data.method === "PAYOO"
                ? "Giao dịch Payoo Demo đang chờ xử lý."
                : "Đang chờ nhân viên xác nhận giao dịch tiền mặt.",
          );
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

  function continueToVisitorSite() {
    sessionStorage.setItem("visitorPaid", "1");

    const visitorUrl = new URL("/", window.location.origin);
    visitorUrl.searchParams.set("lang", language);

    if (getPaymentSource() === "qr") {
      visitorUrl.searchParams.set("source", "qr");
    }

    window.location.assign(visitorUrl);
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
                  className={`payment-option ${
                    method === "online" ? "selected" : ""
                  }`}
                  onClick={() => setMethod("online")}
                  disabled={loading || Boolean(transactionCode)}
                >
                  <span className="payment-option-icon online">
                    <CreditCard size={22} />
                  </span>

                  <span className="payment-option-text">
                    <strong>VNPAY</strong>
                    <span>Thanh toán trực tuyến qua cổng VNPAY</span>
                  </span>

                  <span className="payment-radio">
                    {method === "online" ? "✓" : ""}
                  </span>
                </button>

                <button
                  type="button"
                  className={`payment-option ${
                    method === "cash" ? "selected" : ""
                  }`}
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

                  <span className="payment-radio">
                    {method === "cash" ? "✓" : ""}
                  </span>
                </button>
              </div>

              {method === "online" && (
                <div className="payment-action-panel">
                  <p>
                    Thanh toán an toàn qua VNPAY Sandbox. Số tiền:{" "}
                    <strong>50.000 đồng</strong>
                  </p>

                  <button
                    type="button"
                    className="payment-primary-button"
                    onClick={createVnpayPayment}
                    disabled={loading}
                  >
                    {loading
                      ? "Đang chuyển đến VNPAY..."
                      : "Thanh toán bằng VNPAY"}
                  </button>

                  {message && (
                    <div className="payment-message" role="alert">
                      <span>{message}</span>
                    </div>
                  )}
                </div>
              )}

              {method === "cash" && (
                <div className="payment-action-panel">
                  {!transactionCode ? (
                    <>
                      <p>
                        Tạo giao dịch trước, sau đó đưa mã giao dịch cho nhân
                        viên tại điểm tham quan.
                      </p>

                      <button
                        type="button"
                        className="payment-primary-button"
                        onClick={createCashPayment}
                        disabled={loading}
                      >
                        {loading
                          ? "Đang tạo giao dịch..."
                          : "Tạo giao dịch tiền mặt"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Mã giao dịch của bạn:</p>

                      <strong className="payment-transaction-code-value">
                        {transactionCode}
                      </strong>

                      <p>
                        Số tiền cần thanh toán: <strong>50.000 đồng</strong>
                      </p>

                      <p>
                        Sau khi nhân viên xác nhận đã thu tiền, hãy nhập Claim
                        code mà nhân viên cung cấp.
                      </p>

                      <form
                        className="payment-claim-form"
                        onSubmit={submitClaimCode}
                      >
                        <label htmlFor="claim-code">
                          Mã xác nhận (Claim code)
                        </label>

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

                  {status === "error" && transactionCode && (
                    <button
                      type="button"
                      className="payment-primary-button"
                      onClick={resetPayment}
                      disabled={loading}
                    >
                      Tạo giao dịch khác
                    </button>
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
              Payoo Demo chỉ mô phỏng kết quả thanh toán, không kết nối Payoo
              thật. Thanh toán tiền mặt chỉ được cấp quyền sau khi nhân viên xác
              nhận và Claim code hợp lệ.
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
