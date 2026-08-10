export function FormField({ label, error, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error ? <small className="error-text">{error}</small> : null}
    </label>
  )
}
