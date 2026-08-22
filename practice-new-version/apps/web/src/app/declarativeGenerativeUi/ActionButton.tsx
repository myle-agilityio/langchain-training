import { useState } from "react";
import type React from "react";
import { colors } from "./theme";

export const ActionButton = ({
  label,
  doneLabel,
  action,
  children: child,
}: {
  label: string;
  doneLabel: string;
  // Callers may pass the Button catalog's raw action descriptor, not a callback — it isn't
  // wired to a dispatcher yet, so only call it when it's actually callable.
  action?: unknown;
  children?: React.ReactNode;
}) => {
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={done}
      style={{
        width: "100%",
        padding: "10px 16px",
        borderRadius: "10px",
        border: done ? "1px solid #bbf7d0" : `1px solid ${colors.border}`,
        background: done ? colors.btnDoneBg : colors.btnBg,
        color: done ? "#059669" : colors.cardFg,
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: done ? "default" : "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
      }}
      onClick={() => {
        if (!done) {
          if (typeof action === "function") action();
          setDone(true);
        }
      }}
    >
      {done && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {done ? doneLabel : (child ?? label)}
    </button>
  );
};
