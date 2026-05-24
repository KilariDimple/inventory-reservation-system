"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 10px rgba(0, 0, 0, 0.05)",
          borderRadius: "16px",
          padding: "16px",
        },
      }}
      richColors
      closeButton
    />
  );
}
