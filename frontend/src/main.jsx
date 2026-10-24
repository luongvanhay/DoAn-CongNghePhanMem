import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import PaymentPage from "./pages/Payment/PaymentPage.jsx";

const path = window.location.pathname;

const page = path === "/payment" ? <PaymentPage /> : <App />;

createRoot(document.getElementById("root")).render(
  <StrictMode>{page}</StrictMode>,
);
