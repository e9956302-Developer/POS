import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/**
 * SearchableSelect
 * High-performance direct in-place searchable combobox.
 *
 * Key Features:
 * - Search directly in the dropdown box itself (no awkward second search box in the list)
 * - Sub-millisecond substring search with pre-computed lowercase indices
 * - Instant DOM rendering capped at 60 items (eliminates lag with thousands of records)
 * - Zero smooth-scroll blocking (instant keyboard navigation)
 * - Strict integrity: Only pre-existing options can be chosen
 * - Standard <select> compatibility: onChange synthetic event { target: { name, id, value } }
 * - Supports both `<option>` children and `options={[{ value, label, sublabel }]}` prop
 */
export function SearchableSelect({
  value,
  onChange,
  options = null,
  children = null,
  placeholder = "Search and select...",
  disabled = false,
  required = false,
  name = "",
  id = "",
  className = "",
  style = {},
  allowClear = true,
  autoFocus = false,
  inputRef: externalInputRef = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const internalInputRef = useRef(null);
  const inputRef = externalInputRef || internalInputRef;
  const listRef = useRef(null);

  // Parse options once when options/children change, pre-computing lowercase strings
  const parsedOptions = useMemo(() => {
    const list = [];

    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (typeof opt === "object" && opt !== null) {
          const val = opt.value !== undefined ? String(opt.value) : "";
          const lbl = opt.label !== undefined ? String(opt.label) : (opt.name || opt.value || "");
          const sub = opt.sublabel || opt.description || opt.code || "";
          list.push({
            value: val,
            label: lbl,
            sublabel: sub,
            disabled: Boolean(opt.disabled),
            labelLower: lbl.toLowerCase(),
            sublabelLower: sub ? sub.toLowerCase() : "",
            valueLower: val.toLowerCase()
          });
        } else {
          const str = String(opt);
          const strLower = str.toLowerCase();
          list.push({
            value: str,
            label: str,
            sublabel: "",
            disabled: false,
            labelLower: strLower,
            sublabelLower: "",
            valueLower: strLower
          });
        }
      }
      return list;
    }

    if (children) {
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && (child.type === "option" || child.props?.value !== undefined)) {
          const val = child.props.value !== undefined ? String(child.props.value) : "";
          const lbl = typeof child.props.children === "string"
            ? child.props.children
            : Array.isArray(child.props.children)
            ? child.props.children.map((c) => (typeof c === "string" || typeof c === "number" ? c : "")).join("").replace(/\s+/g, " ").trim()
            : String(child.props.value || "");
          const sub = child.props.sublabel || "";
          list.push({
            value: val,
            label: lbl,
            sublabel: sub,
            disabled: Boolean(child.props.disabled),
            labelLower: lbl.toLowerCase(),
            sublabelLower: sub ? sub.toLowerCase() : "",
            valueLower: val.toLowerCase()
          });
        }
      });
      return list;
    }

    return list;
  }, [options, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    const strVal = value !== undefined && value !== null ? String(value) : "";
    return parsedOptions.find((opt) => opt.value === strVal) || null;
  }, [parsedOptions, value]);

  // Fast substring filtering capped at 60 items for instant 60fps responsiveness
  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchQuery.trim()) {
      return parsedOptions.slice(0, 60);
    }
    const q = searchQuery.toLowerCase().trim();
    const result = [];
    for (let i = 0; i < parsedOptions.length; i++) {
      const opt = parsedOptions[i];
      if (
        opt.labelLower.includes(q) ||
        opt.sublabelLower.includes(q) ||
        opt.valueLower.includes(q)
      ) {
        result.push(opt);
        if (result.length >= 60) break;
      }
    }
    return result;
  }, [parsedOptions, searchQuery, isTyping]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Instant scroll (behavior: auto) to avoid main thread freeze
  useEffect(() => {
    if (isOpen && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex];
      if (itemEl && typeof itemEl.scrollIntoView === "function") {
        itemEl.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const triggerChange = useCallback((newVal) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: { name, id, value: newVal },
        currentTarget: { name, id, value: newVal }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
    setIsTyping(false);
    setSearchQuery("");
  }, [disabled, onChange, name, id]);

  function handleSelectOption(opt) {
    if (opt.disabled) return;
    triggerChange(opt.value);
  }

  function handleClear(e) {
    e.stopPropagation();
    e.preventDefault();
    triggerChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function handleInputFocus() {
    if (disabled) return;
    setIsOpen(true);
  }

  function handleInputClick() {
    if (disabled) return;
    setIsOpen(true);
    // If not typing yet, select text so user can immediately type over it or browse
    if (!isTyping && inputRef.current) {
      inputRef.current.select();
    }
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setSearchQuery(val);
    setIsTyping(true);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(0);
  }

  function handleKeyDown(e) {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        if (inputRef.current) inputRef.current.select();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(filteredOptions.length - 1, 0)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      setSearchQuery("");
      if (inputRef.current) inputRef.current.blur();
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setIsTyping(false);
      setSearchQuery("");
    }
  }

  const inputValue = isTyping
    ? searchQuery
    : (selectedOption ? selectedOption.label : "");

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style
      }}
    >
      {/* Hidden native input for standard form submission & required checks */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={selectedOption ? selectedOption.value : ""}
        required={required}
      />

      {/* Main Combobox Input Box — Type directly in the box! */}
      <div
        className="searchable-combobox-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0.25rem 0.5rem 0.25rem 0.75rem",
          background: disabled
            ? "var(--surface-strong)"
            : "var(--input-bg, var(--surface))",
          border: isOpen
            ? "1.5px solid var(--primary)"
            : "1px solid var(--border)",
          borderRadius: "10px",
          boxShadow: isOpen
            ? "0 0 0 3px rgba(var(--primary-rgb), 0.2)"
            : "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxSizing: "border-box",
          minHeight: "42px",
          gap: "0.35rem"
        }}
      >
        <span style={{ fontSize: "0.95rem", opacity: 0.6, flexShrink: 0, userSelect: "none" }}>🔍</span>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: selectedOption && !isTyping ? "var(--text)" : "inherit",
            fontSize: "0.88rem",
            fontWeight: selectedOption && !isTyping ? 600 : 400,
            cursor: disabled ? "not-allowed" : "text",
            padding: "0.35rem 0",
            fontFamily: "inherit"
          }}
        />

        {/* Clear (✕) & Dropdown Arrow (▼) Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}>
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              tabIndex={-1}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: "0.85rem",
                borderRadius: "4px",
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            >
              ✕
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (disabled) return;
              if (isOpen) {
                setIsOpen(false);
                setIsTyping(false);
                setSearchQuery("");
              } else {
                setIsOpen(true);
                if (inputRef.current) inputRef.current.focus();
              }
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              cursor: disabled ? "not-allowed" : "pointer",
              padding: "4px 6px",
              fontSize: "0.75rem",
              borderRadius: "4px",
              lineHeight: 1,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease"
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Dropdown Options List (DIRECT LIST — NO REDUNDANT INNER SEARCH BOX!) */}
      {isOpen && (
        <div
          className="searchable-combobox-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1)",
            zIndex: 9999,
            overflow: "hidden",
            boxSizing: "border-box"
          }}
        >
          <div
            ref={listRef}
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              overflowX: "hidden",
              padding: "0.25rem"
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "0.85rem 0.75rem",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: "0.84rem"
                }}
              >
                <span>🚫 No matching options found.</span>
                <p className="small muted" style={{ margin: "0.2rem 0 0 0", fontSize: "0.74rem" }}>
                  Only pre-existing items can be chosen.
                </p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && selectedOption.value === opt.value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    onMouseDown={(e) => {
                      // onMouseDown prevents input blur before selection completes
                      e.preventDefault();
                      handleSelectOption(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                      background: isSelected
                        ? "rgba(var(--primary-rgb), 0.16)"
                        : isHighlighted
                        ? "var(--surface-strong)"
                        : "transparent",
                      color: opt.disabled
                        ? "var(--muted)"
                        : isSelected
                        ? "var(--primary)"
                        : "var(--text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                      userSelect: "none"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.05rem", overflow: "hidden", minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="small muted" style={{ fontSize: "0.72rem", opacity: 0.8 }}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span style={{ color: "var(--primary)", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Item Counter Footer */}
          <div
            style={{
              padding: "0.3rem 0.6rem",
              background: "var(--surface-strong)",
              borderTop: "1px solid var(--border)",
              fontSize: "0.72rem",
              color: "var(--muted)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              userSelect: "none"
            }}
          >
            <span>
              {filteredOptions.length === parsedOptions.length
                ? `${parsedOptions.length} items`
                : `Showing ${filteredOptions.length} of ${parsedOptions.length} matches`}
            </span>
            <span style={{ fontWeight: 600 }}>🔒 Pre-existing items only</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
