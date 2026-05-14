import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  disabled = false,
  autoComplete = "current-password",
  style = {},
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-panel-soft)",
          color: "var(--text-primary)",
          padding: "12px 44px 12px 12px",
          outline: "none",
          ...style,
        }}
      />

      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        disabled={disabled}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-card)",
          color: "var(--text-primary)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "grid",
          placeItems: "center",
          padding: 0,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {show && (
            <path
              d="M4 4l16 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
