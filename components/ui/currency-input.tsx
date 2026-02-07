"use client";

import { useState, useEffect } from "react";

interface CurrencyInputProps {
  label?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}

function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d.-]/g, "");
  if (!num || num === "-") return num;

  const parts = num.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

export function CurrencyInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => formatWithCommas(value));

  useEffect(() => {
    setDisplay(formatWithCommas(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow digits, commas, dots, minus
    const cleaned = raw.replace(/[^\d,.-]/g, "");
    setDisplay(cleaned);
    onChange(stripCommas(cleaned));
  }

  function handleBlur() {
    setDisplay(formatWithCommas(stripCommas(display)));
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        id={id}
        className="input"
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
