export function ToggleSwitch({
  checked = false,
  onChange,
  onLabel = "Active",
  offLabel = "Inactive",
  size = "md",
  disabled = false,
  title,
  ariaLabel
}) {
  const isChecked = Boolean(checked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={ariaLabel || (isChecked ? onLabel : offLabel)}
      title={title || (isChecked ? onLabel : offLabel)}
      disabled={disabled}
      className={`fancy-toggle-switch ${size} ${isChecked ? "is-checked" : "is-unchecked"} ${disabled ? "is-disabled" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) {
          onChange(!isChecked);
        }
      }}
    >
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
      {(onLabel || offLabel) && (
        <span className="toggle-label">
          {isChecked ? onLabel : offLabel}
        </span>
      )}
    </button>
  );
}
