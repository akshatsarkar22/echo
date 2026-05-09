import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "@/App";

const buf = Buffer;
Object.assign(globalThis as { Buffer?: typeof buf }, {
  Buffer: buf,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
