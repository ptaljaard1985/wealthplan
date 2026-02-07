"use client";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function InputField({ label, error, id, className = "", ...props }: InputFieldProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input id={id} className={`input ${className}`} {...props} />
      {error && (
        <p style={{ color: "var(--error-500)", fontSize: "var(--text-xs)", marginTop: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextareaField({ label, error, id, className = "", ...props }: TextareaFieldProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <textarea id={id} className={`textarea ${className}`} {...props} />
      {error && (
        <p style={{ color: "var(--error-500)", fontSize: "var(--text-xs)", marginTop: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function SelectField({
  label,
  error,
  id,
  options,
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <select id={id} className={`select ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ color: "var(--error-500)", fontSize: "var(--text-xs)", marginTop: "4px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
