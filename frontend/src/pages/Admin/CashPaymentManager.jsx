import { useCallback, useEffect, useState } from "react";
import { formatNumber, readResponse } from "./adminUtils.js";

const CASH_PENDING_URL = "/api/content/payments/cash/pending";
const VNPAY_PAYMENTS_URL = "/api/content/payments/vnpay";

function getPaymentStatusLabel(status) {
  return {
    PAID: "Đã thanh toán",
    PENDING: "Đang chờ",
    FAILED: "Thất bại",
    CANCELLED: "Đã hủy",
  }[status] || status || "Không rõ";
}

function CashPaymentManager({ token }) {
  const [payments, setPayments] = useState([]);
  const [vnpayPayments, setVnpayPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const [cashResponse, vnpayResponse] = await Promise.all([
        fetch(CASH_PENDING_URL, { headers }),
        fetch(VNPAY_PAYMENTS_URL, { headers }),
      ]);
      const [cashData, vnpayData] = await Promise.all([
        readResponse(cashResponse),
        readResponse(vnpayResponse),
      ]);
      if (!Array.isArray(cashData) || !Array.isArray(vnpayData)) {
        throw new Error("Máy chủ trả về danh sách giao dịch không hợp lệ.");
      }
      setPayments(cashData);
      setVnpayPayments(vnpayData);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Không kết nối được máy chủ thanh toán. Kiểm tra API Gateway và content-service rồi thử làm mới."
          : err.message || "Không tải được danh sách giao dịch.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadPayments();
    }, 0);
    return () => clearTimeout(timerId);
  }, [loadPayments]);

  async function confirmCashPayment(transactionCode) {
    setConfirmingCode(transactionCode);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/content/payments/${encodeURIComponent(transactionCode)}/confirm-cash`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await readResponse(response);
      setPayments((current) =>
        current.map((payment) =>
          payment.transactionCode === transactionCode
            ? { ...payment, claimCode: data.claimCode }
            : payment,
        ),
      );
      setMessage(`Đã xác nhận thu tiền cho giao dịch ${transactionCode}.`);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Không kết nối được máy chủ thanh toán. Kiểm tra API Gateway và content-service rồi thử lại."
          : err.message || "Không thể xác nhận giao dịch tiền mặt.",
      );
    } finally {
      setConfirmingCode("");
    }
  }

  return (
    <section className="admin-poi-section cash-payment-sections" id="cash-payments">
      <div className="cash-payment-page-heading">
        <div>
          <p className="admin-eyebrow">QUẢN LÝ GIAO DỊCH</p>
          <h1>Thanh toán</h1>
          <p className="admin-subtitle">Theo dõi giao dịch tiền mặt và VNPay.</p>
        </div>
        <button
          className="admin-refresh"
          type="button"
          onClick={loadPayments}
          disabled={loading}
        >
          ↻ {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {message && <div className="admin-poi-message" role="status">{message}</div>}
      {error && <div className="admin-poi-message error" role="alert">{error}</div>}

      <article className="admin-poi-panel payment-method-panel">
        <div className="admin-content-list-heading">
          <div>
            <h2>Giao dịch tiền mặt</h2>
            <p>Xác nhận giao dịch sau khi đã thu tiền và đưa Claim code cho khách.</p>
          </div>
          <span className="admin-poi-count">{payments.length} giao dịch</span>
        </div>

        {loading ? (
          <div className="admin-poi-empty">Đang tải giao dịch tiền mặt...</div>
        ) : payments.length === 0 ? (
          <div className="admin-poi-empty">Không có giao dịch tiền mặt đang chờ xác nhận.</div>
        ) : (
          <div className="admin-visitor-table-wrap">
            <table className="admin-visitor-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Số tiền</th>
                  <th>Ngôn ngữ</th>
                  <th>Thời gian tạo</th>
                  <th>Xác nhận / Claim code</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.transactionCode}>
                    <td><code>{payment.transactionCode}</code></td>
                    <td>{formatNumber(payment.amount)} đ</td>
                    <td>{payment.language || "vi"}</td>
                    <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString("vi-VN") : "—"}</td>
                    <td className="cash-confirm-cell">
                      {payment.claimCode ? (
                        <>
                          <span className="cash-confirmed-label">Đã xác nhận</span>
                          <span className="cash-claim-code" title="Claim code cần đưa cho khách">
                            Mã: <strong>{payment.claimCode}</strong>
                          </span>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-refresh"
                          onClick={() => confirmCashPayment(payment.transactionCode)}
                          disabled={Boolean(confirmingCode)}
                        >
                          {confirmingCode === payment.transactionCode ? "Đang xác nhận..." : "Đã thu tiền"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="admin-poi-panel payment-method-panel">
        <div className="admin-content-list-heading">
          <div>
            <h2>Giao dịch VNPay</h2>
            <p>Lịch sử thanh toán trực tuyến và trạng thái giao dịch.</p>
          </div>
          <span className="admin-poi-count">{vnpayPayments.length} giao dịch</span>
        </div>

        {loading ? (
          <div className="admin-poi-empty">Đang tải giao dịch VNPay...</div>
        ) : vnpayPayments.length === 0 ? (
          <div className="admin-poi-empty">Chưa có giao dịch VNPay.</div>
        ) : (
          <div className="admin-visitor-table-wrap">
            <table className="admin-visitor-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Số tiền</th>
                  <th>Ngôn ngữ</th>
                  <th>Trạng thái</th>
                  <th>Thời gian tạo</th>
                  <th>Thời gian thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {vnpayPayments.map((payment) => (
                  <tr key={payment.transactionCode}>
                    <td><code>{payment.transactionCode}</code></td>
                    <td>{formatNumber(payment.amount)} đ</td>
                    <td>{payment.language || "vi"}</td>
                    <td>
                      <span className={`vnpay-status ${String(payment.status || "").toLowerCase()}`}>
                        {getPaymentStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString("vi-VN") : "—"}</td>
                    <td>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("vi-VN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

export default CashPaymentManager;
