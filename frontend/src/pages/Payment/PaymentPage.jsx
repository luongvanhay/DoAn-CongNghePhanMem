import { useState } from "react";
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  MapPin,
  ArrowLeft,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import "./PaymentPage.css";

const TICKET_PRICE = 50000;

export default function PaymentPage() {
  const [method, setMethod] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("select");
  const [loading, setLoading] = useState(false);

  function chooseMethod(value) {
    setMethod(value);
    setMessage("");
    setStatus("select");
    setClaimCode("");
    setTransactionCode("");
  }

  async function handleCreateCashPayment() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: TICKET_PRICE,
          method: "CASH",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể tạo giao dịch.");
      }

      setTransactionCode(data.transactionCode);
      setStatus("pending");
      setMessage(
        "Đã tạo giao dịch. Vui lòng đưa mã giao dịch cho nhân viên và thanh toán 50.000 đồng. Sau khi nhân viên xác nhận, bạn sẽ nhận Claim code.",
      );
    } catch (error) {
      setStatus("notice");
      setMessage(
        error.message || "Không thể kết nối máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOnlinePayment() {
    setStatus("notice");
    setMessage(
      "Payoo chưa được tích hợp với máy chủ. Vui lòng chọn thanh toán tiền mặt hoặc thử lại khi cổng Payoo đã được cấu hình.",
    );
  }

  async function handleClaimSubmit(event) {
    event.preventDefault();

    if (!transactionCode) {
      setMessage("Vui lòng tạo giao dịch tiền mặt trước.");
      return;
    }

    if (!claimCode.trim()) {
      setMessage("Vui lòng nhập Claim code do nhân viên cung cấp.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/payments/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claimCode: claimCode.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể xác thực Claim code.");
      }

      setStatus("success");
      setMessage(
        data.message || "Xác thực thành công. Quyền truy cập đã được cấp.",
      );
    } catch (error) {
      setStatus("notice");
      setMessage(
        error.message || "Không thể kết nối máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
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
          <p>
            Giá vé: <strong>50.000 đồng/lượt</strong>
          </p>
        </div>

        <section className="payment-card">
          <h2>Chọn phương thức thanh toán</h2>
          <p className="payment-description">
            Chọn một trong hai hình thức bên dưới.
          </p>

          <button
            type="button"
            className={`payment-option ${
              method === "online" ? "selected" : ""
            }`}
            onClick={() => chooseMethod("online")}
            disabled={loading || status === "success"}
          >
            <span className="payment-option-icon online">
              <CreditCard size={24} />
            </span>
            <span className="payment-option-text">
              <strong>Thanh toán trực tuyến</strong>
              <span>Thanh toán qua cổng Payoo</span>
            </span>
            <span className="payment-radio">
              {method === "online" ? "✓" : ""}
            </span>
          </button>

          <button
            type="button"
            className={`payment-option ${method === "cash" ? "selected" : ""}`}
            onClick={() => chooseMethod("cash")}
            disabled={loading || status === "success"}
          >
            <span className="payment-option-icon cash">
              <Banknote size={24} />
            </span>
            <span className="payment-option-text">
              <strong>Thanh toán tiền mặt</strong>
              <span>Nhận mã xác nhận từ nhân viên</span>
            </span>
            <span className="payment-radio">
              {method === "cash" ? "✓" : ""}
            </span>
          </button>

          {method === "online" && (
            <div className="payment-action-panel">
              <p>
                Giá vé là 50.000 đồng/lượt. Cổng Payoo hiện chưa được kết nối
                với máy chủ.
              </p>
              <button
                type="button"
                className="payment-primary-button"
                onClick={handleOnlinePayment}
                disabled={loading}
              >
                Tiếp tục thanh toán
              </button>
            </div>
          )}

          {method === "cash" && status !== "success" && (
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
                    onClick={handleCreateCashPayment}
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
                  <strong>{transactionCode}</strong>
                  <p>
                    Số tiền cần thanh toán: <strong>50.000 đồng</strong>
                  </p>
                  <p>
                    Sau khi nhân viên xác nhận đã thu tiền, hãy nhập Claim code
                    mà nhân viên cung cấp.
                  </p>

                  <form onSubmit={handleClaimSubmit}>
                    <label htmlFor="claimCode">Mã xác nhận (Claim code)</label>
                    <input
                      id="claimCode"
                      type="text"
                      value={claimCode}
                      onChange={(event) => setClaimCode(event.target.value)}
                      placeholder="Nhập mã do nhân viên cung cấp"
                      autoComplete="off"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      className="payment-primary-button"
                      disabled={loading}
                    >
                      {loading ? "Đang xác thực..." : "Xác thực mã"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {message && (
            <div className="payment-message" role="status">
              {(status === "success" || status === "pending") && (
                <CheckCircle2 size={18} />
              )}
              <span>{message}</span>
            </div>
          )}

          {status === "success" && (
            <div className="payment-action-panel">
              <button
                type="button"
                className="payment-primary-button"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Tiếp tục tham quan
              </button>
            </div>
          )}

          <div className="payment-note">
            <ShieldCheck size={18} />
            <span>
              Quyền truy cập chỉ được cấp sau khi máy chủ xác minh giao dịch đã
              thanh toán và Claim code hợp lệ.
            </span>
          </div>
        </section>

        <button
          type="button"
          className="payment-back-button"
          onClick={() => {
            window.location.href = "/";
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
