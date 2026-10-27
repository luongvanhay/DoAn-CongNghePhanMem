import { useCallback, useEffect, useState } from "react";
import { formatNumber, readResponse } from "./adminUtils.js";
function CashPaymentManager({ token }) {
  const [payments, setPayments] = useState([]);
  const [claimCodes, setClaimCodes] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/cash/pending", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setPayments(await readResponse(response));
    } catch (err) {
      setError(err.message || "Không tải được giao dịch tiền mặt.");
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
        `/api/payments/${encodeURIComponent(transactionCode)}/confirm-cash`,
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
        current.filter(
          (payment) => payment.transactionCode !== transactionCode,
        ),
      );
      setClaimCodes((current) => ({
        ...current,
        [transactionCode]: data.claimCode,
      }));
      setMessage(`Đã xác nhận thu tiền cho giao dịch ${transactionCode}.`);
    } catch (err) {
      setError(err.message || "Không thể xác nhận giao dịch tiền mặt.");
    } finally {
      setConfirmingCode("");
    }
  }

  return (
    <section className="admin-poi-section" id="cash-payments">
      <article className="admin-poi-panel">
        <div className="admin-content-list-heading">
          <div>
            <h2>Thanh toán tiền mặt tại quầy</h2>
            <p>
              Xác nhận sau khi đã thu 50.000 đồng. Đưa mã xác nhận hiển thị cho
              khách để họ mở quyền tham quan.
            </p>
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

        {message && (
          <div className="admin-poi-message" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="admin-poi-message error" role="alert">
            {error}
          </div>
        )}
        {Object.entries(claimCodes).map(([transactionCode, code]) => (
          <div
            className="admin-poi-message"
            role="status"
            key={transactionCode}
          >
            Mã xác nhận cho {transactionCode}: <strong>{code}</strong>
          </div>
        ))}

        {loading ? (
          <div className="admin-poi-empty">Đang tải giao dịch tiền mặt...</div>
        ) : payments.length === 0 ? (
          <div className="admin-poi-empty">
            Không có giao dịch tiền mặt nào đang chờ xác nhận.
          </div>
        ) : (
          <div className="admin-visitor-table-wrap">
            <table className="admin-visitor-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Số tiền</th>
                  <th>Ngôn ngữ</th>
                  <th>Thời gian tạo</th>
                  <th>Xác nhận</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.transactionCode}>
                    <td>
                      <code>{payment.transactionCode}</code>
                    </td>
                    <td>{formatNumber(payment.amount)} đ</td>
                    <td>{payment.language || "vi"}</td>
                    <td>
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-refresh"
                        onClick={() =>
                          confirmCashPayment(payment.transactionCode)
                        }
                        disabled={Boolean(confirmingCode)}
                      >
                        {confirmingCode === payment.transactionCode
                          ? "Đang xác nhận..."
                          : "Đã thu tiền"}
                      </button>
                    </td>
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
