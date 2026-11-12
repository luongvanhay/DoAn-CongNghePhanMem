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
import { supportedLanguageCodes } from "../../i18n";
import { getVisitSessionId } from "../../services/contentService";
import "./PaymentPage.css";

const TICKET_PRICE = 50000;

const PAYMENT_COPY = {
  siteLabel: "HỆ THỐNG THAM QUAN",
  secure: "Thanh toán an toàn",
  welcome: "CHÀO MỪNG QUÝ KHÁCH",
  pageTitle: "Đăng ký quyền tham quan",
  introduction:
    "Vui lòng chọn phương thức thanh toán để sử dụng bản đồ tham quan và khám phá các địa điểm tại Chùa Linh Ứng.",
  ticketPrice: "Giá vé: 50.000 đồng/lượt",
  paymentSuccess: "Hello",
  visitSite: "Vào trang tham quan",
  chooseMethod: "Chọn phương thức thanh toán",
  chooseMethodHint: "Chọn một trong hai hình thức bên dưới.",
  onlineDescription: "Thanh toán trực tuyến qua cổng VNPAY",
  cashMethod: "Thanh toán tiền mặt",
  cashDescription: "Nhận mã xác nhận từ nhân viên",
  onlineAmount: "Thanh toán an toàn qua VNPAY Sandbox. Số tiền: 50.000 đồng",
  connectingVnpay: "Đang chuyển đến VNPAY...",
  payByVnpay: "Thanh toán bằng VNPAY",
  createCashHint:
    "Tạo giao dịch trước, sau đó đưa mã giao dịch cho nhân viên tại điểm tham quan.",
  creatingTransaction: "Đang tạo giao dịch...",
  createCash: "Tạo giao dịch tiền mặt",
  yourTransactionCode: "Mã giao dịch của bạn:",
  amountDue: "Số tiền cần thanh toán: 50.000 đồng",
  claimInstructions:
    "Sau khi nhân viên xác nhận đã thu tiền, hãy nhập Claim code mà nhân viên cung cấp.",
  claimCodeLabel: "Mã xác nhận (Claim code)",
  claimCodePlaceholder: "Nhập mã do nhân viên cung cấp",
  verifying: "Đang xác thực...",
  verifyCode: "Xác thực mã",
  anotherTransaction: "Tạo giao dịch khác",
  selectMethodHint: "Vui lòng chọn phương thức thanh toán ở trên.",
  paymentNote:
    "Payoo Demo chỉ mô phỏng kết quả thanh toán, không kết nối Payoo thật. Thanh toán tiền mặt chỉ được cấp quyền sau khi nhân viên xác nhận và Claim code hợp lệ.",
  backToMap: "Quay lại bản đồ",
  loadingTranslation: "Đang dịch trang thanh toán...",
  translationUnavailable:
    "Không thể dịch trang thanh toán lúc này. Nội dung đang hiển thị bằng tiếng Việt.",
  paymentError: "Không thể tạo giao dịch VNPAY.",
  transactionDataError: "Máy chủ chưa trả về mã giao dịch hoặc URL VNPAY.",
  cashError: "Không thể tạo giao dịch tiền mặt.",
  transactionCodeError: "Máy chủ chưa trả về mã giao dịch.",
  cashPending:
    "Đưa mã giao dịch cho nhân viên và thanh toán 50.000 đồng. Sau khi nhân viên xác nhận, hãy nhập mã xác nhận được cung cấp.",
  payooUpdateError: "Không thể cập nhật giao dịch Payoo Demo.",
  payooSuccess: "Hello.",
  payooCancelled: "Giao dịch Payoo Demo đã bị hủy.",
  transactionPending: "Giao dịch chưa hoàn tất.",
  payooError: "Có lỗi khi xử lý Payoo Demo.",
  claimError: "Hello Hello.",
  claimSuccess: "Xác thực thành công. Bạn có thể vào trang tham quan.",
  transactionCheckError: "Không thể kiểm tra giao dịch.",
  paidAndReady: "Thanh toán thành công. Bạn có thể vào trang tham quan.",
  transactionCancelled: "Hello Hello.",
  vnpayPending: "Giao dịch đang được xác nhận. Vui lòng chờ trong giây lát.",
  payooPending: "Giao dịch Payoo Demo đang chờ xử lý.",
  cashWaiting: "Đang chờ nhân viên xác nhận giao dịch tiền mặt.",
};

const paymentTranslationCache = new Map();

async function translatePaymentText(text, target) {
  if (!text || target === "vi") {
    return text;
  }

  const cacheKey = `${target}:${text}`;
  if (paymentTranslationCache.has(cacheKey)) {
    return paymentTranslationCache.get(cacheKey);
  }

  const response = await fetch("/api/translation/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source: "vi", target }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.translated_text) {
    throw new Error(
      data.message || `Dịch nội dung thất bại (HTTP ${response.status}).`,
    );
  }

  paymentTranslationCache.set(cacheKey, data.translated_text);
  return data.translated_text;
}

async function translatePaymentCopy(target) {
  const entries = Object.entries(PAYMENT_COPY);
  const markers = entries.map((_, index) => `[[PAYMENT_${index}]]`);

  const text = entries
    .map(([key], index) => `${markers[index]} ${PAYMENT_COPY[key]}`)
    .join("\n");

  const translated = await translatePaymentText(text, target);

  const parts = markers.map((marker) => {
    const markerIndex = translated.indexOf(marker);

    if (markerIndex < 0) {
      throw new Error("Bản dịch trang thanh toán không đầy đủ.");
    }

    return markerIndex;
  });

  return Object.fromEntries(
    entries.map(([key], index) => {
      const start = parts[index] + markers[index].length;
      const end =
        index + 1 < parts.length ? parts[index + 1] : translated.length;

      return [key, translated.slice(start, end).trim()];
    }),
  );
}

function getCheckoutLanguage() {
  const requestedLanguage = new URLSearchParams(window.location.search).get(
    "lang",
  );

  return supportedLanguageCodes.has(requestedLanguage)
    ? requestedLanguage
    : "vi";
}

/**
 * Gửi yêu cầu tạo giao dịch.
 * Giữ nguyên endpoint và dữ liệu backend hiện tại.
 */
async function createPaymentRequest(payload) {
  const response = await fetch("/api/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "1",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  let data = {};

  try {
    data = JSON.parse(responseText);
  } catch {
    // Giữ nguyên nội dung phản hồi nếu không phải JSON.
  }

  if (!response.ok) {
    const responseLooksLikeNgrok = /ngrok|browser warning|visit site/i.test(
      responseText,
    );

    const detail =
      data.message ||
      data.error ||
      (responseLooksLikeNgrok
        ? "Phản hồi có thể đến từ trang cảnh báo ngrok."
        : responseText.slice(0, 300));

    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return data;
}

export default function PaymentPage() {
  const language = getCheckoutLanguage();

  const [transactionCode, setTransactionCode] = useState("");
  const [method, setMethod] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [translatedCopy, setTranslatedCopy] = useState(null);
  const [translationStatus, setTranslationStatus] = useState(
    language === "vi" ? "ready" : "loading",
  );
  const [copyError, setCopyError] = useState("");
  const [translatedMessage, setTranslatedMessage] = useState(null);

  const copy =
    language === "vi"
      ? PAYMENT_COPY
      : translatedCopy?.language === language
        ? { ...PAYMENT_COPY, ...translatedCopy.values }
        : PAYMENT_COPY;

  const copyLoading =
    language !== "vi" &&
    translationStatus === "loading" &&
    translatedCopy?.language !== language;

  const displayMessage =
    language === "vi" || !message
      ? message
      : translatedMessage?.language === language &&
          translatedMessage.source === message
        ? translatedMessage.text
        : message;

  useEffect(() => {
    let cancelled = false;

    if (language === "vi") {
      return undefined;
    }

    void translatePaymentCopy(language)
      .then((values) => {
        if (!cancelled) {
          setTranslatedCopy({ language, values });
          setCopyError("");
          setTranslationStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCopyError(error.message || PAYMENT_COPY.translationUnavailable);
          setTranslationStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    if (!message || language === "vi") {
      return undefined;
    }

    void translatePaymentText(message, language)
      .then((text) => {
        if (!cancelled) {
          setTranslatedMessage({ language, source: message, text });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCopyError(error.message || PAYMENT_COPY.translationUnavailable);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, message]);

  function getPaymentSource() {
    return new URLSearchParams(window.location.search).get("source");
  }

  async function createVnpayPayment() {
    setLoading(true);
    setStatus("ready");
    setMessage("");
    setClaimCode("");

    try {
      const data = await createPaymentRequest({
        amount: TICKET_PRICE,
        method: "VNPAY",
        language,
        source: getPaymentSource(),
        sessionId: getVisitSessionId(),
      });

      if (!data.transactionCode || !data.paymentUrl) {
        throw new Error(copy.transactionDataError);
      }

      setTransactionCode(data.transactionCode);
      setMethod("online");

      // Chuyển khách sang trang thanh toán VNPAY.
      window.location.assign(data.paymentUrl);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || copy.paymentError);
    } finally {
      setLoading(false);
    }
  }

  async function createCashPayment() {
    setLoading(true);
    setStatus("ready");
    setMessage("");
    setClaimCode("");

    try {
      const data = await createPaymentRequest({
        amount: TICKET_PRICE,
        method: "CASH",
        language,
        source: getPaymentSource(),
        sessionId: getVisitSessionId(),
      });

      if (!data.transactionCode) {
        throw new Error(copy.transactionCodeError);
      }

      setTransactionCode(data.transactionCode);
      setMethod("cash");
      setStatus("pending");
      setMessage(copy.cashPending);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || copy.cashError);
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
        throw new Error(data.message || copy.payooUpdateError);
      }

      if (data.status === "PAID" && data.accessGranted) {
        setStatus("success");
        setMessage(data.message || copy.payooSuccess);
      } else if (data.status === "FAILED") {
        setStatus("error");
        setMessage(data.message || copy.payooCancelled);
      } else {
        setStatus("pending");
        setMessage(data.message || copy.transactionPending);
      }
    } catch (error) {
      setMessage(error.message || copy.payooError);
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
        throw new Error(data.message || copy.claimError);
      }

      setStatus("success");
      setMessage(data.message || copy.claimSuccess);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || copy.claimError);
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
          throw new Error(data.message || PAYMENT_COPY.transactionCheckError);
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
          setMessage(PAYMENT_COPY.paidAndReady);
        } else if (data.status === "FAILED" || data.status === "CANCELLED") {
          setStatus("error");
          setMessage(PAYMENT_COPY.transactionCancelled);
        } else {
          setStatus("pending");
          setMessage(
            data.method === "VNPAY"
              ? PAYMENT_COPY.vnpayPending
              : data.method === "PAYOO"
                ? PAYMENT_COPY.payooPending
                : PAYMENT_COPY.cashWaiting,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error.message || PAYMENT_COPY.transactionCheckError);
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
            <strong>Hệ Thống Thuyết Minh Tự Động</strong>
            <span>{copy.siteLabel}</span>
          </div>
        </div>

        <span className="payment-secure">
          <ShieldCheck size={16} />
          {copy.secure}
        </span>
      </header>

      <section className="payment-container">
        {copyLoading && (
          <div className="payment-message" role="status">
            {copy.loadingTranslation}
          </div>
        )}

        {copyError && (
          <div className="payment-message" role="alert">
            {copyError}
          </div>
        )}

        <div className="payment-intro">
          <div className="payment-qr-icon">
            <QrCode size={30} />
          </div>

          <p className="payment-eyebrow">{copy.welcome}</p>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.introduction}</p>
          <p className="payment-price">{copy.ticketPrice}</p>
        </div>

        <section className="payment-card">
          {status === "success" ? (
            <div className="payment-success">
              <CheckCircle2 size={48} />
              <h2>{copy.paymentSuccess}</h2>
              <p>{displayMessage}</p>

              <button
                type="button"
                className="payment-primary-button"
                onClick={continueToVisitorSite}
              >
                {copy.visitSite}
              </button>
            </div>
          ) : (
            <>
              <h2>{copy.chooseMethod}</h2>
              <p className="payment-description">{copy.chooseMethodHint}</p>

              <div className="payment-method-options">
                <button
                  type="button"
                  className={`payment-option ${
                    method === "online" ? "selected" : ""
                  }`}
                  onClick={() => setMethod("online")}
                  disabled={loading || copyLoading || Boolean(transactionCode)}
                >
                  <span className="payment-option-icon online">
                    <CreditCard size={22} />
                  </span>

                  <span className="payment-option-text">
                    <strong>VNPAY</strong>
                    <span>{copy.onlineDescription}</span>
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
                  disabled={loading || copyLoading || Boolean(transactionCode)}
                >
                  <span className="payment-option-icon cash">
                    <Banknote size={22} />
                  </span>

                  <span className="payment-option-text">
                    <strong>{copy.cashMethod}</strong>
                    <span>{copy.cashDescription}</span>
                  </span>

                  <span className="payment-radio">
                    {method === "cash" ? "✓" : ""}
                  </span>
                </button>
              </div>

              {method === "online" && (
                <div className="payment-action-panel">
                  <p>{copy.onlineAmount}</p>

                  <button
                    type="button"
                    className="payment-primary-button"
                    onClick={createVnpayPayment}
                    disabled={loading || copyLoading}
                  >
                    {loading ? copy.connectingVnpay : copy.payByVnpay}
                  </button>

                  {message && (
                    <div className="payment-message" role="alert">
                      <span>{displayMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {method === "cash" && (
                <div className="payment-action-panel">
                  {!transactionCode ? (
                    <>
                      <p>{copy.createCashHint}</p>

                      <button
                        type="button"
                        className="payment-primary-button"
                        onClick={createCashPayment}
                        disabled={loading || copyLoading}
                      >
                        {loading ? copy.creatingTransaction : copy.createCash}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>{copy.yourTransactionCode}</p>

                      <strong className="payment-transaction-code-value">
                        {transactionCode}
                      </strong>

                      <p>{copy.amountDue}</p>
                      <p>{copy.claimInstructions}</p>

                      <form
                        className="payment-claim-form"
                        onSubmit={submitClaimCode}
                      >
                        <label htmlFor="claim-code">
                          {copy.claimCodeLabel}
                        </label>

                        <input
                          id="claim-code"
                          value={claimCode}
                          onChange={(event) => setClaimCode(event.target.value)}
                          autoComplete="off"
                          disabled={loading || copyLoading}
                          placeholder={copy.claimCodePlaceholder}
                        />

                        <button
                          type="submit"
                          className="payment-primary-button"
                          disabled={loading || copyLoading || !claimCode.trim()}
                        >
                          {loading ? copy.verifying : copy.verifyCode}
                        </button>
                      </form>
                    </>
                  )}

                  {message && (
                    <div className="payment-message" role="alert">
                      <span>{displayMessage}</span>
                    </div>
                  )}

                  {status === "error" && transactionCode && (
                    <button
                      type="button"
                      className="payment-primary-button"
                      onClick={resetPayment}
                      disabled={loading || copyLoading}
                    >
                      {copy.anotherTransaction}
                    </button>
                  )}
                </div>
              )}

              {!method && (
                <div className="payment-action-panel">
                  <p>{copy.selectMethodHint}</p>
                </div>
              )}
            </>
          )}

          <div className="payment-note">
            <ShieldCheck size={18} />
            <span>{copy.paymentNote}</span>
          </div>
        </section>

        <button
          type="button"
          className="payment-back-button"
          onClick={() => window.location.assign("/")}
        >
          <ArrowLeft size={17} />
          {copy.backToMap}
        </button>
      </section>

      <footer className="payment-footer">
        © {new Date().getFullYear()} Chùa Linh Ứng · {copy.siteLabel}
      </footer>
    </main>
  );
}
