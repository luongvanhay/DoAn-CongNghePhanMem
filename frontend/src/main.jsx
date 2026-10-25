import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PaymentPage from "./pages/Payment/PaymentPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {window.location.pathname === "/payment" ? <PaymentPage /> : <App />}
  </StrictMode>,
);
