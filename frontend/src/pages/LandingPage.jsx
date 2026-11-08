import { useState, useMemo } from "react";

export function LandingPage({ onGoToLogin, onQuickDemoLogin }) {
  // Navigation & Theme State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'annual'
  const [openFaq, setOpenFaq] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Interactive Live POS Terminal Simulator State
  const [cartItems, setCartItems] = useState([
    {
      id: "demo-phone-1",
      name: "Apple iPhone 15 Pro (128GB - Blue)",
      type: "handset",
      imei: "356789101112131",
      price: 295000,
      qty: 1
    },
    {
      id: "demo-acc-1",
      name: "Apple 20W USB-C Power Adapter",
      type: "accessory",
      imei: null,
      price: 2800,
      qty: 1
    }
  ]);
  const [posCustomerName, setPosCustomerName] = useState("Muhammad Bilal (Walk-in)");
  const [posPaymentMethod, setPosPaymentMethod] = useState("cash");
  const [posDiscount, setPosDiscount] = useState(500);
  const [posReceiptPrinted, setPosReceiptPrinted] = useState(false);

  // Handset catalog for simulator
  const sampleProducts = [
    { id: "p1", name: "iPhone 15 Pro 128GB", type: "handset", imei: "356789101112131", price: 295000, icon: "📱" },
    { id: "p2", name: "Samsung S24 Ultra 256GB", type: "handset", imei: "358901234567892", price: 365000, icon: "📱" },
    { id: "p3", name: "Redmi Note 13 Pro 8/256", type: "handset", imei: "864501234567893", price: 68000, icon: "📱" },
    { id: "p4", name: "20W USB-C Fast Charger", type: "accessory", imei: null, price: 2800, icon: "🔌" },
    { id: "p5", name: "AirPods Pro 2 MagSafe", type: "accessory", imei: null, price: 48000, icon: "🎧" },
    { id: "p6", name: "9D Tempered Screen Guard", type: "accessory", imei: null, price: 750, icon: "🛡️" }
  ];

  const handleAddSampleItem = (item) => {
    setPosReceiptPrinted(false);
    if (item.type === "handset") {
      const exists = cartItems.find((ci) => ci.imei === item.imei);
      if (exists) return;
      setCartItems([...cartItems, { ...item, qty: 1 }]);
    } else {
      const existing = cartItems.find((ci) => ci.id === item.id);
      if (existing) {
        setCartItems(cartItems.map((ci) => (ci.id === item.id ? { ...ci, qty: ci.qty + 1 } : ci)));
      } else {
        setCartItems([...cartItems, { ...item, qty: 1 }]);
      }
    }
  };

  const handleRemoveCartItem = (index) => {
    setPosReceiptPrinted(false);
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const posSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * (item.qty || 1), 0);
  }, [cartItems]);

  const posTotal = Math.max(0, posSubtotal - posDiscount);

  // Core Modules Catalog
  const moduleCategories = [
    { key: "all", label: "All Modules (18)" },
    { key: "pos", label: "POS & Sales" },
    { key: "inventory", label: "Inventory & IMEI" },
    { key: "finance", label: "Khata & Financials" },
    { key: "operations", label: "Branches & HR" }
  ];

  const allModules = [
    {
      category: "pos",
      icon: "💰",
      title: "Point-of-Sale Sales Counter",
      tag: "Core POS",
      desc: "Blazing fast sales counter with barcode & 15-digit IMEI scanner support, quick customer creation, partial payments, and split payment modes.",
      highlights: ["Instant IMEI verification", "Thermal 80mm & 58mm receipts", "Barcode scanner ready"]
    },
    {
      category: "pos",
      icon: "↩️",
      title: "Customer Sale Returns & Refunds",
      tag: "Returns & Restock",
      desc: "Full IMEI tracking on customer returns. Automatically restore returned handsets into branch stock, issue cash refunds, or update customer credit ledger.",
      highlights: ["Automatic IMEI stock restoration", "Customer ledger adjustment", "Voided transaction trace"]
    },
    {
      category: "inventory",
      icon: "📱",
      title: "Serialized IMEI Mobile Inventory",
      tag: "Handset Tracking",
      desc: "Comprehensive smartphone unit tracker with 15-digit IMEI validation, warranty status, PTA verification, purchase cost history, and lifecycle audit.",
      highlights: ["Unique IMEI duplicate prevention", "Color & storage variant tags", "Handset profit margin calc"]
    },
    {
      category: "inventory",
      icon: "📦",
      title: "Non-Serialized Accessories Catalog",
      tag: "Barcode & Stock",
      desc: "Stock tracking for chargers, cases, power banks, and tempered glasses. Set minimum alert levels, generate SKU barcodes, and bulk reorder.",
      highlights: ["Low stock warning threshold", "Automatic barcode generation", "Opening stock valuation"]
    },
    {
      category: "pos",
      icon: "🔧",
      title: "Repair Workshop & Technician Desk",
      tag: "Service Center",
      desc: "Device intake ticketing, diagnostic checklists, technician job assignment, spare parts used, labor fees, and customer repair claim slips.",
      highlights: ["Repair claim slip with barcode", "Technician commission tracking", "Spare parts stock deduction"]
    },
    {
      category: "finance",
      icon: "💵",
      title: "Cash Register & Shift Reconciliation",
      tag: "Zero Theft",
      desc: "Strict counter accountability. Opening cash balance, real-time in/out logging, denomination counts, and shift closing verification to stop counter leakage.",
      highlights: ["Blind cashier closing audits", "Denomination breakdown grid", "Cash drop & petty cash log"]
    },
    {
      category: "finance",
      icon: "👥",
      title: "Customer & Vendor Khata Ledgers",
      tag: "Parties Khata",
      desc: "Digital Udhar / Khata management with credit limits, installment recording, transaction history, aging receivables, and WhatsApp payment reminders.",
      highlights: ["Direct WhatsApp Khata statements", "Customer & vendor credit limits", "Installment payment receipts"]
    },
    {
      category: "operations",
      icon: "🏪",
      title: "Multi-Branch Outlets & Branch Switcher",
      tag: "Multi-Store",
      desc: "Centralized control for multi-outlet phone shops. Manage Main Branch, Mall Outlet, and Wholesale Hub with independent inventories and central dashboard.",
      highlights: ["Real-time multi-branch metrics", "Per-branch subscription isolation", "Instant branch switching"]
    },
    {
      category: "operations",
      icon: "🔄",
      title: "Inter-Branch Stock Transfers",
      tag: "Stock Logistics",
      desc: "Safely transfer high-value handsets and accessories between branches. Includes dispatch confirmation, in-transit state, and destination manager acceptance.",
      highlights: ["Two-step transfer verification", "In-transit IMEI audit trail", "Zero inventory phantom loss"]
    },
    {
      category: "finance",
      icon: "🤝",
      title: "Partner Equity & Branch Dividends",
      tag: "Partnership",
      desc: "Capital contributions, partner drawings, and automated branch profit sharing with strict 100% equity validation. Clean financial ledgers for all partners.",
      highlights: ["Strict 100% equity sum check", "Automatic dividend disbursement", "Partner capital & drawing ledger"]
    },
    {
      category: "operations",
      icon: "🧑‍💼",
      title: "Employee Salaries, Attendance & Advances",
      tag: "Staff & Payroll",
      desc: "Staff attendance roster, salary advance disbursements, automatic advance deduction on month-end, and 1-click batch payroll approval.",
      highlights: ["Daily attendance calendar", "Automatic advance deductions", "Batch salary distribution"]
    },
    {
      category: "finance",
      icon: "📊",
      title: "Real-Time Profit/Loss & Audits",
      tag: "Analytics",
      desc: "Instant visibility into daily sales, gross margin, operating expenses, dead inventory alerts, cash flow, and comprehensive audit trails.",
      highlights: ["Real-time net profit calculation", "Dead-stock & aging report", "Export to Excel & PDF"]
    }
  ];

  const filteredModules = useMemo(() => {
    if (selectedCategory === "all") return allModules;
    return allModules.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  // Frequently Asked Questions
  const faqs = [
    {
      q: "How does DigitalMarkaz360 prevent duplicate or fraudulent IMEIs?",
      a: "Our system features a strict 15-digit Luhn algorithm IMEI validator. Each IMEI entered is validated in real-time. If an IMEI already exists in your active inventory or another branch, the system immediately flags the duplicate, completely preventing accidental double-selling or duplicate stock entries."
    },
    {
      q: "Can I print receipts on standard thermal POS printers?",
      a: "Yes! DigitalMarkaz360 supports standard 80mm and 58mm thermal receipt printers (Epson, Xprinter, Rongta, Star, etc.) via USB, Bluetooth, or LAN, as well as full-page A4 PDF invoices. Thermal receipts include your shop name, logo, phone number, IMEI numbers, warranty terms, and QR/barcodes."
    },
    {
      q: "What happens if a branch subscription expires?",
      a: "Our server-side guard pauses new operations for that specific branch to protect your business. Your branch data is never deleted or altered. The Company Admin can view stats on the company dashboard and renew the subscription anytime; the branch unblocks automatically the instant payment or a renewal package is assigned."
    },
    {
      q: "Can I manage phone repairs and technician commissions?",
      a: "Absolutely! Our Repair Service Workshop module lets you create repair tickets with fault diagnosis, record the customer's phone passcodes, assign specific technicians, log spare parts used from your inventory, track labor charges, and print professional claim slips with barcodes."
    },
    {
      q: "How does the Khata / Ledger feature work with customer dues?",
      a: "Every customer and vendor has a digital ledger. When a sale is made with partial payment, the balance automatically logs into customer receivables. You can set credit limits, view aging reports (due today, overdue), and even send automated payment reminders."
    },
    {
      q: "Is my shop data isolated and safe from other shops?",
      a: "Yes. DigitalMarkaz360 is built on an enterprise multi-tenant architecture with tenant isolation. Your businesses, branches, products, customer lists, and financial records are strictly isolated at both database and application layers."
    }
  ];

  const handleLaunchDemoRole = (role) => {
    setShowDemoModal(false);
    if (role === "admin") {
      onQuickDemoLogin({ email: "admin@mobilepos.local", password: "admin123" });
    } else if (role === "manager") {
      onQuickDemoLogin({ email: "manager@mobilepos.local", password: "admin123" });
    } else if (role === "cashier") {
      onQuickDemoLogin({ email: "cashier@mobilepos.local", password: "admin123" });
    } else if (role === "top_admin") {
      onQuickDemoLogin({ email: "topadmin@mobilepos.local", password: "admin123" });
    } else {
      onGoToLogin();
    }
  };

  return (
    <div className="landing-page-root">
      {/* =========================================================================
          1. TOP NAVIGATION BAR (GLASSMORPHIC FLOATING NAVBAR)
          ========================================================================= */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <img src="/logo.png" alt="DigitalMarkaz360" className="landing-brand-logo" />
            <div className="landing-brand-text">
              <div className="landing-brand-title">DigitalMarkaz360</div>
              <div className="landing-brand-tagline">پورا کاروبار، ایک مرکز</div>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pos-demo">Live POS Demo</a>
            <a href="#imei-workshop">IMEI & Repairs</a>
            <a href="#modules">All Modules</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-btn-ghost"
              onClick={onGoToLogin}
              title="Sign in to your account"
            >
              Login
            </button>
            <button
              type="button"
              className="landing-btn-primary"
              onClick={() => setShowDemoModal(true)}
              title="Launch 1-Click Interactive Demo"
            >
              <span>⚡</span>
              <span>Launch Demo</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-dropdown">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pos-demo" onClick={() => setMobileMenuOpen(false)}>Live POS Demo</a>
            <a href="#imei-workshop" onClick={() => setMobileMenuOpen(false)}>IMEI & Repairs</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)}>All Modules</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="mobile-actions">
              <button type="button" className="landing-btn-ghost" onClick={onGoToLogin} style={{ width: "100%" }}>
                Login
              </button>
              <button type="button" className="landing-btn-primary" onClick={() => { setMobileMenuOpen(false); setShowDemoModal(true); }} style={{ width: "100%" }}>
                ⚡ Launch Demo
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION WITH VIBRANT GRADIENTS & ISOMETRIC MOCKUP
          ========================================================================= */}
      <section className="landing-hero" id="hero">
        <div className="hero-glow-blob blob-teal" />
        <div className="hero-glow-blob blob-purple" />

        <div className="hero-container">
          <div className="hero-announcement-pill">
            <span className="pill-dot" />
            <span>Pakistan&apos;s #1 Dedicated Mobile Shop & Multi-Branch POS SaaS</span>
            <span className="pill-badge">v2.4 Enterprise</span>
          </div>

          <h1 className="hero-title">
            Poora Karobar, Ek Markaz.
            <span className="hero-gradient-text">Complete Retail Intelligence for Every Handset, IMEI & Branch.</span>
          </h1>

          <p className="hero-description">
            Say goodbye to messy paper khatas, lost repair slips, and counter cash shortages.
            DigitalMarkaz360 delivers serialized smartphone tracking, instant thermal POS receipts,
            repair workshop ticketing, partner equity splits, and multi-branch synchronization in one elegant cloud platform.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="hero-btn-cta primary"
              onClick={() => setShowDemoModal(true)}
            >
              <span>🚀</span>
              <span>Launch 1-Click Interactive Demo</span>
            </button>
            <a href="#pos-demo" className="hero-btn-cta secondary">
              <span>🎮</span>
              <span>Try Live POS Terminal Below</span>
            </a>
            <button
              type="button"
              className="hero-btn-cta outline"
              onClick={onGoToLogin}
            >
              <span>🔑</span>
              <span>Member Sign In</span>
            </button>
          </div>

          {/* Quick metric trust badges */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <span className="trust-icon">🔒</span>
              <div>
                <strong>Tenant Isolated</strong>
                <span>Bank-grade security</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">📱</span>
              <div>
                <strong>15-Digit IMEI</strong>
                <span>Zero duplicate serials</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🖨️</span>
              <div>
                <strong>Thermal & A4 Invoices</strong>
                <span>Instant counter print</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🤝</span>
              <div>
                <strong>100% Equity Math</strong>
                <span>Automated partner dividends</span>
              </div>
            </div>
          </div>

          {/* Isometric Hero Showcase Mockup */}
          <div className="hero-mockup-wrapper">
            <div className="hero-mockup-frame">
              <img
                src="/landing_hero_showcase.jpg"
                alt="DigitalMarkaz360 Interface Showcase"
                className="hero-mockup-img"
              />
              <div className="hero-mockup-glow" />

              {/* Floating Glassmorphic Badges */}
              <div className="floating-badge badge-top-left">
                <div className="badge-icon" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>📈</div>
                <div>
                  <div className="badge-subtitle">Today&apos;s Gross Sales</div>
                  <div className="badge-main">PKR 485,900</div>
                  <div className="badge-trend">+18.4% vs last week • 28 Invoices</div>
                </div>
              </div>

              <div className="floating-badge badge-bottom-right">
                <div className="badge-icon" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>📱</div>
                <div>
                  <div className="badge-subtitle">Handset Stock Live</div>
                  <div className="badge-main">1,248 Verified IMEIs</div>
                  <div className="badge-trend" style={{ color: "#38bdf8" }}>100% In Stock & Verified</div>
                </div>
              </div>

              <div className="floating-badge badge-top-right">
                <div className="badge-icon" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" }}>🏪</div>
                <div>
                  <div className="badge-subtitle">Markaz Multi-Branch</div>
                  <div className="badge-main">3 Outlets Synced</div>
                  <div className="badge-trend" style={{ color: "#10b981" }}>● Real-time sync active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. INTERACTIVE LIVE POS CHECKOUT SIMULATOR (HANDS-ON DEMO)
          ========================================================================= */}
      <section className="landing-section pos-demo-section" id="pos-demo">
        <div className="section-header text-center">
          <div className="section-eyebrow">Interactive Simulator</div>
          <h2 className="section-title">Experience the Counter POS in Real-Time</h2>
          <p className="section-subtitle">
            Click phones, scan accessories, and simulate a lightning-fast counter checkout.
            See how receipt generation and stock deduction work in milliseconds.
          </p>
        </div>

        <div className="pos-simulator-container">
          {/* Left Panel: POS Counter Interface */}
          <div className="pos-counter-card">
            <div className="pos-counter-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>POS Sales Terminal</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Main Counter • Shift #42 Active</span>
              </div>
              <span className="live-pulse-badge">● Counter Online</span>
            </div>

            {/* Quick Catalog Bar */}
            <div className="pos-catalog-section">
              <label className="pos-input-label">Tap to Add Sample Stock Item:</label>
              <div className="pos-catalog-grid">
                {sampleProducts.map((p) => {
                  const isInCart = p.type === "handset" && cartItems.some((ci) => ci.imei === p.imei);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`pos-product-tile ${isInCart ? "added" : ""}`}
                      onClick={() => handleAddSampleItem(p)}
                    >
                      <span className="tile-icon">{p.icon}</span>
                      <div className="tile-info">
                        <strong>{p.name}</strong>
                        <span>PKR {p.price.toLocaleString()}</span>
                      </div>
                      <span className="tile-add-btn">{isInCart ? "✓ Added" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Cart Items */}
            <div className="pos-cart-section">
              <div className="pos-cart-header">
                <span>Selected Items ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    className="link-btn-clear"
                    onClick={() => setCartItems([])}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="pos-empty-cart">
                  <span>🛒</span>
                  <p>Counter is empty. Click any product above to add.</p>
                </div>
              ) : (
                <div className="pos-cart-list">
                  {cartItems.map((item, idx) => (
                    <div key={item.id + idx} className="pos-cart-row">
                      <div className="cart-row-main">
                        <strong>{item.name}</strong>
                        {item.imei && (
                          <div className="cart-row-imei">
                            <span>IMEI:</span> <code>{item.imei}</code>
                          </div>
                        )}
                        <span className="cart-row-type">
                          {item.type === "handset" ? "📱 Serialized Handset" : "🔌 Non-serialized Accessory"}
                        </span>
                      </div>
                      <div className="cart-row-right">
                        <span className="cart-row-price">
                          PKR {(item.price * (item.qty || 1)).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          className="cart-row-del"
                          onClick={() => handleRemoveCartItem(idx)}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment & Customer Options */}
            <div className="pos-checkout-footer">
              <div className="pos-footer-grid">
                <div>
                  <label className="pos-input-label">Customer Name</label>
                  <input
                    type="text"
                    className="pos-input-field"
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="pos-input-label">Payment Mode</label>
                  <select
                    className="pos-input-field"
                    value={posPaymentMethod}
                    onChange={(e) => setPosPaymentMethod(e.target.value)}
                  >
                    <option value="cash">💵 Cash Counter</option>
                    <option value="easypaisa">📱 EasyPaisa Mobile</option>
                    <option value="jazzcash">💳 JazzCash Wallet</option>
                    <option value="bank">🏛️ Bank Direct Transfer</option>
                  </select>
                </div>
              </div>

              <div className="pos-totals-box">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>PKR {posSubtotal.toLocaleString()}</span>
                </div>
                <div className="totals-row">
                  <span>Discount</span>
                  <span style={{ color: "#10b981" }}>- PKR {posDiscount.toLocaleString()}</span>
                </div>
                <div className="totals-row grand-total">
                  <strong>Total Amount Payable</strong>
                  <strong>PKR {posTotal.toLocaleString()}</strong>
                </div>
              </div>

              <button
                type="button"
                className="pos-btn-checkout"
                disabled={cartItems.length === 0}
                onClick={() => setPosReceiptPrinted(true)}
              >
                <span>🖨️</span>
                <span>Confirm & Print Thermal Receipt</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Thermal Receipt Live Simulation */}
          <div className="pos-receipt-card">
            <div className="receipt-paper-top" />
            <div className="receipt-paper">
              <div className="receipt-header">
                <img src="/logo.png" alt="Logo" className="receipt-logo" />
                <h4 style={{ margin: "4px 0", fontSize: "1.1rem", fontWeight: 800 }}>DEMO MOBILE ZONE</h4>
                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>Shop #14, Hafeez Centre, Main Boulevard, Lahore</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>Phone: +92 300 1234567 • NTN: 8945612-4</div>
                <div className="receipt-divider" />
                <div className="receipt-meta">
                  <div><strong>Invoice:</strong> INV-2026-0894</div>
                  <div><strong>Date:</strong> 21-Oct-2026 15:30</div>
                  <div><strong>Cashier:</strong> Ali Raza (C-01)</div>
                  <div><strong>Customer:</strong> {posCustomerName}</div>
                </div>
                <div className="receipt-divider" />
              </div>

              <div className="receipt-body">
                <div className="receipt-items-table">
                  <div className="items-header">
                    <span>Item / IMEI</span>
                    <span style={{ textAlign: "right" }}>Total</span>
                  </div>
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <div className="receipt-item-desc">
                        <strong>{item.name}</strong>
                        {item.imei && <div className="receipt-imei-tag">IMEI: {item.imei}</div>}
                      </div>
                      <div className="receipt-item-val">
                        PKR {(item.price * (item.qty || 1)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="receipt-divider" />

                <div className="receipt-summary-lines">
                  <div className="summary-line">
                    <span>Subtotal:</span>
                    <span>PKR {posSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="summary-line">
                    <span>Discount:</span>
                    <span>PKR {posDiscount.toLocaleString()}</span>
                  </div>
                  <div className="summary-line total">
                    <strong>NET TOTAL:</strong>
                    <strong>PKR {posTotal.toLocaleString()}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Paid Via:</span>
                    <span style={{ textTransform: "uppercase" }}>{posPaymentMethod}</span>
                  </div>
                </div>

                <div className="receipt-divider" />

                <div className="receipt-barcode-box">
                  <div className="barcode-bars" />
                  <div className="barcode-number">*INV-2026-0894*</div>
                </div>

                <div className="receipt-footer-text">
                  <div>Thank you for choosing Demo Mobile Zone!</div>
                  <div>Verified IMEI Guaranteed • 7 Days Replacement</div>
                  <div style={{ marginTop: "4px", fontSize: "0.7rem", color: "#64748b" }}>
                    Powered by DigitalMarkaz360 POS
                  </div>
                </div>
              </div>

              {posReceiptPrinted && (
                <div className="receipt-printed-overlay">
                  <span className="success-check">✓</span>
                  <strong>Receipt Printed!</strong>
                  <span>Stock deducted & cash drawer updated</span>
                </div>
              )}
            </div>
            <div className="receipt-paper-bottom" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. SPECIALIZED MOBILE RETAIL & WORKSHOP SHOWCASE
          ========================================================================= */}
      <section className="landing-section imei-workshop-section" id="imei-workshop">
        <div className="section-container">
          <div className="grid-2col">
            <div className="showcase-content">
              <div className="section-eyebrow">Dedicated Mobile Architecture</div>
              <h2 className="section-title">Built Specifically for Phone Shops, Not Grocery Stores.</h2>
              <p className="section-subtitle">
                Generic POS systems treat phones like cans of soda. DigitalMarkaz360 is custom-engineered
                for the actual realities of mobile retail, serialized inventory, and repair labs.
              </p>

              <div className="pillars-list">
                <div className="pillar-item">
                  <div className="pillar-icon">📱</div>
                  <div>
                    <h4>Dual-Item Inventory Engine</h4>
                    <p>
                      Track serialized smartphones with unique 15-digit IMEIs, purchase cost, color, and warranty,
                      alongside non-serialized accessories (chargers, cases, cables) tracked by barcode and reorder thresholds.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon">🔧</div>
                  <div>
                    <h4>Repair Lab & Technician Desk</h4>
                    <p>
                      Complete device intake workflow. Record customer passcodes, diagnostic checks, assign technicians,
                      deduct spare parts (screens, batteries), charge labor, and print claim tickets with barcodes.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon">💵</div>
                  <div>
                    <h4>Cash Drawer & Shift Reconciliation</h4>
                    <p>
                      Stop counter cash leakage. Enforce opening balances, track mid-shift cash drops, and require
                      physical cash denomination counts before closing any cashier shift.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon">🔄</div>
                  <div>
                    <h4>Inter-Branch Stock Transfers</h4>
                    <p>
                      Need to move 10 iPhone 15s from your Wholesale Hub to Mall Branch? Dispatch with transit tracking
                      and require the receiving manager&apos;s physical acceptance before stock moves.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="showcase-media">
              <div className="media-card-frame">
                <img
                  src="/landing_repair_imei.jpg"
                  alt="Repair Workshop and IMEI Verification Showcase"
                  className="showcase-img"
                />
                <div className="media-overlay-badge">
                  <span>⚡</span>
                  <div>
                    <strong>End-to-End Smartphone Lifecycle</strong>
                    <small>Intake → Sales → Warranty → Repair</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. COMPLETE ENTERPRISE MODULE CATALOG (FILTERABLE GRID)
          ========================================================================= */}
      <section className="landing-section modules-section" id="modules">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Enterprise Capabilities</div>
            <h2 className="section-title">Everything Your Mobile Business Needs Under One Roof</h2>
            <p className="section-subtitle">
              Explore 18 integrated enterprise modules designed to automate every department of your mobile enterprise.
            </p>

            {/* Filter Tabs */}
            <div className="module-filter-bar">
              {moduleCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`module-tab-btn ${selectedCategory === cat.key ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modules-grid">
            {filteredModules.map((mod, idx) => (
              <div key={idx} className="module-card">
                <div className="module-card-top">
                  <span className="module-icon">{mod.icon}</span>
                  <span className="module-tag">{mod.tag}</span>
                </div>
                <h3 className="module-title">{mod.title}</h3>
                <p className="module-desc">{mod.desc}</p>
                <div className="module-highlights">
                  {mod.highlights.map((h, hIdx) => (
                    <div key={hIdx} className="highlight-pill">
                      <span>✓</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. COMPARISON MATRIX: DIGITALMARKAZ360 VS SPREADSHEETS & LEGACY POS
          ========================================================================= */}
      <section className="landing-section comparison-section" id="features">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">The Competitive Advantage</div>
            <h2 className="section-title">Why Mobile Retailers Choose DigitalMarkaz360</h2>
            <p className="section-subtitle">
              See why leading mobile shop owners across Pakistan are replacing error-prone spreadsheets and generic software.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature / Capability</th>
                  <th className="highlight-col">DigitalMarkaz360</th>
                  <th>Generic Retail POS</th>
                  <th>Excel & Paper Registers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>15-Digit Serial IMEI Tracking</strong>
                    <span>Validates Luhn formula & stops duplicate handset entries</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Native & Instant</span></td>
                  <td><span className="cross-badge">❌ Manual text notes</span></td>
                  <td><span className="cross-badge">❌ Severe mix-ups</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Phone Repair Workshop Desk</strong>
                    <span>Technician tracking, diagnosis, spare parts, customer slip</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Complete Workflow</span></td>
                  <td><span className="cross-badge">❌ Not available</span></td>
                  <td><span className="cross-badge">❌ Lost claim paper</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Counter Cash Drawer Reconciliation</strong>
                    <span>Shift audits, denomination counting, blind checkout</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Strict Shift Audit</span></td>
                  <td><span className="warn-badge">⚠️ Basic cash total</span></td>
                  <td><span className="cross-badge">❌ High theft risk</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Customer & Vendor Udhar Khata</strong>
                    <span>Credit limits, aging reminders, WhatsApp statement export</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Built-in Ledger</span></td>
                  <td><span className="warn-badge">⚠️ Extra paid plugin</span></td>
                  <td><span className="cross-badge">❌ Lost money</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Multi-Branch Isolated Subscriptions</strong>
                    <span>Branch-level expiry protection without deleting data</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Dynamic Per-Branch Guard</span></td>
                  <td><span className="cross-badge">❌ All-or-nothing block</span></td>
                  <td><span className="cross-badge">❌ Non-existent</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Partner Equity & Dividends</strong>
                    <span>Automated profit share calculation with 100% split validation</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Automated Math</span></td>
                  <td><span className="cross-badge">❌ Not supported</span></td>
                  <td><span className="cross-badge">❌ Partner disputes</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Multi-Theme Modern UI</strong>
                    <span>Obsidian Dark, Emerald, Cobalt, Crimson with fluid animations</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ 5 Curated Themes</span></td>
                  <td><span className="cross-badge">❌ Clunky 2005 look</span></td>
                  <td><span className="cross-badge">❌ White grid only</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PRICING & SUBSCRIPTION PACKAGES
          ========================================================================= */}
      <section className="landing-section pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Clear & Simple Pricing</div>
            <h2 className="section-title">Transparent Packages for Every Stage of Growth</h2>
            <p className="section-subtitle">
              No hidden fees, no complicated contracts. Choose the plan that fits your outlets.
            </p>

            {/* Billing Switcher */}
            <div className="pricing-toggle-wrap">
              <button
                type="button"
                className={`pricing-toggle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                className={`pricing-toggle-btn ${billingCycle === "annual" ? "active" : ""}`}
                onClick={() => setBillingCycle("annual")}
              >
                Annual Billing <span className="discount-tag">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-cards-grid">
            {/* Starter Plan */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <span className="tier-badge">Single Store</span>
                <h3 className="tier-name">Starter Outlet</h3>
                <p className="tier-desc">Ideal for single mobile shops starting digital operations.</p>
                <div className="tier-price">
                  <span className="price-currency">PKR</span>
                  <span className="price-amount">{billingCycle === "annual" ? "1,200" : "1,500"}</span>
                  <span className="price-period">/ month</span>
                </div>
              </div>

              <div className="pricing-features-list">
                <div className="p-feat"><span>✓</span> 1 Branch Outlet License</div>
                <div className="p-feat"><span>✓</span> Serialized Handset & IMEI Tracking</div>
                <div className="p-feat"><span>✓</span> Non-serialized Accessories Catalog</div>
                <div className="p-feat"><span>✓</span> POS Counter & Thermal Receipt Printing</div>
                <div className="p-feat"><span>✓</span> Cash Register Daily Reconciliation</div>
                <div className="p-feat"><span>✓</span> Customer & Vendor Khata Ledgers</div>
                <div className="p-feat"><span>✓</span> Standard Sales & P&L Reports</div>
                <div className="p-feat muted"><span>✕</span> Repair Workshop Desk</div>
                <div className="p-feat muted"><span>✕</span> Inter-Branch Stock Transfers</div>
              </div>

              <button
                type="button"
                className="pricing-btn secondary"
                onClick={() => setShowDemoModal(true)}
              >
                Get Started with Starter
              </button>
            </div>

            {/* Professional Plan (Featured) */}
            <div className="pricing-card featured">
              <div className="popular-badge">⭐ Most Popular for Retailers</div>
              <div className="pricing-card-header">
                <span className="tier-badge popular">Multi-Branch Growth</span>
                <h3 className="tier-name">Professional Outlet</h3>
                <p className="tier-desc">For high-volume retail stores with repair counters & multiple shops.</p>
                <div className="tier-price">
                  <span className="price-currency">PKR</span>
                  <span className="price-amount">{billingCycle === "annual" ? "2,800" : "3,500"}</span>
                  <span className="price-period">/ month</span>
                </div>
              </div>

              <div className="pricing-features-list">
                <div className="p-feat"><span>✓</span> Up to 3 Branch Outlets Included</div>
                <div className="p-feat"><span>✓</span> Everything in Starter Package</div>
                <div className="p-feat"><span>✓</span> <strong>Repair Workshop & Technician Desk</strong></div>
                <div className="p-feat"><span>✓</span> <strong>Inter-Branch Stock Transfers</strong></div>
                <div className="p-feat"><span>✓</span> Staff Attendance, Advances & Salaries</div>
                <div className="p-feat"><span>✓</span> WhatsApp Payment Reminders</div>
                <div className="p-feat"><span>✓</span> Role Permissions (Manager, Cashier, Tech)</div>
                <div className="p-feat"><span>✓</span> 5 Color Themes & Brand Customization</div>
                <div className="p-feat"><span>✓</span> Priority Phone & WhatsApp Support</div>
              </div>

              <button
                type="button"
                className="pricing-btn primary"
                onClick={() => setShowDemoModal(true)}
              >
                Launch Professional Markaz
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <span className="tier-badge">Franchise & Wholesale</span>
                <h3 className="tier-name">Enterprise Markaz</h3>
                <p className="tier-desc">Complete automation for multi-outlet retail chains & wholesale distributors.</p>
                <div className="tier-price">
                  <span className="price-currency">PKR</span>
                  <span className="price-amount">{billingCycle === "annual" ? "6,000" : "7,500"}</span>
                  <span className="price-period">/ month</span>
                </div>
              </div>

              <div className="pricing-features-list">
                <div className="p-feat"><span>✓</span> <strong>Unlimited Branch Outlets</strong></div>
                <div className="p-feat"><span>✓</span> Everything in Professional Package</div>
                <div className="p-feat"><span>✓</span> <strong>Multi-Partner Equity & Auto Dividends</strong></div>
                <div className="p-feat"><span>✓</span> Centralized Wholesale & Distribution Hub</div>
                <div className="p-feat"><span>✓</span> Advanced Forensic Audit Trail Logs</div>
                <div className="p-feat"><span>✓</span> Custom Shop Logo on Receipts & Invoices</div>
                <div className="p-feat"><span>✓</span> Custom Domain & Dedicated Account Manager</div>
                <div className="p-feat"><span>✓</span> 24/7 VIP Emergency Telephone Support</div>
              </div>

              <button
                type="button"
                className="pricing-btn secondary"
                onClick={() => setShowDemoModal(true)}
              >
                Contact Enterprise Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. TESTIMONIALS & MOBILE HUB SUCCESS STORIES
          ========================================================================= */}
      <section className="landing-section testimonials-section">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Customer Trust</div>
            <h2 className="section-title">Trusted by Leading Mobile Retailers</h2>
            <p className="section-subtitle">
              Hear from shop owners in Hafeez Centre, Saddar, Hall Road, and Singapore Plaza.
            </p>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &ldquo;Before DigitalMarkaz360, my staff spent 3 hours every evening reconciling IMEI serials.
                With this software, every sale scans in seconds and the cash drawer matches to the exact rupee at shift close.&rdquo;
              </p>
              <div className="test-author">
                <div className="author-avatar" style={{ background: "#0ea5e9" }}>TM</div>
                <div>
                  <strong>Haji Tariq Mahmood</strong>
                  <span>Al-Rehman Mobile Center • Hafeez Centre, Lahore</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &ldquo;The repair lab module alone paid for the system in one month. We track diagnostic tickets,
                spare parts used, and customer claim slips with barcodes. No more lost phones or customer disputes.&rdquo;
              </p>
              <div className="test-author">
                <div className="author-avatar" style={{ background: "#10b981" }}>KS</div>
                <div>
                  <strong>Kashif Siddiqui</strong>
                  <span>Metro Mobile Hub • Saddar Mobile Market, Karachi</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="test-stars">★★★★★</div>
              <p className="test-quote">
                &ldquo;Managing our 3 branches was a nightmare. Now with Inter-Branch Stock Transfers and central
                dashboard, I see all sales and inventory from my home. The partner equity module makes dividend sharing 100% fair.&rdquo;
              </p>
              <div className="test-author">
                <div className="author-avatar" style={{ background: "#8b5cf6" }}>FM</div>
                <div>
                  <strong>Engr. Farhan Malik</strong>
                  <span>Digital Tech Outlets • Singapore Plaza, Rawalpindi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FREQUENTLY ASKED QUESTIONS (ACCORDION)
          ========================================================================= */}
      <section className="landing-section faq-section" id="faq">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Frequently Asked Questions</div>
            <h2 className="section-title">Everything You Need to Know</h2>
            <p className="section-subtitle">
              Have questions about setup, hardware compatibility, or data security? We have answers.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                  >
                    <span>{f.q}</span>
                    <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer-panel">
                      <p>{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. HIGH-CONVERTING BOTTOM CTA BANNER
          ========================================================================= */}
      <section className="landing-cta-banner">
        <div className="cta-banner-card">
          <div className="cta-content">
            <span className="cta-badge">⚡ Instant Cloud Deployment</span>
            <h2>Ready to Transform Your Mobile Shop into an Automated Enterprise?</h2>
            <p>
              Join hundreds of mobile shop owners who run their sales, IMEIs, repairs, and multi-branch
              finances with complete peace of mind.
            </p>
            <div className="cta-buttons-row">
              <button
                type="button"
                className="landing-btn-primary large"
                onClick={() => setShowDemoModal(true)}
              >
                <span>🚀</span>
                <span>Launch 1-Click Interactive Demo</span>
              </button>
              <button
                type="button"
                className="landing-btn-ghost large"
                onClick={onGoToLogin}
              >
                <span>🔑</span>
                <span>Sign In to Your Markaz</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. FOOTER
          ========================================================================= */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-col brand-col">
              <div className="footer-brand">
                <img src="/logo.png" alt="DigitalMarkaz360" className="footer-logo" />
                <span className="footer-title">DigitalMarkaz360</span>
              </div>
              <p className="footer-tagline">
                پورا کاروبار، ایک مرکز • Pakistan&apos;s all-in-one cloud retail platform engineered
                exclusively for mobile phone shops, repair centers, and wholesale distributors.
              </p>
              <div className="footer-status-tag">
                <span className="status-live-dot" />
                <span>All Cloud Services Operational • 99.98% SLA</span>
              </div>
            </div>

            <div className="footer-col">
              <h4>System Modules</h4>
              <ul>
                <li><a href="#pos-demo">POS Sales Counter</a></li>
                <li><a href="#imei-workshop">Serialized IMEI Inventory</a></li>
                <li><a href="#imei-workshop">Repair Workshop Ticketing</a></li>
                <li><a href="#modules">Cash Register Reconciliation</a></li>
                <li><a href="#modules">Customer & Supplier Khata</a></li>
                <li><a href="#modules">Inter-Branch Stock Transfers</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Platform & Security</h4>
              <ul>
                <li><a href="#features">Multi-Branch Isolation</a></li>
                <li><a href="#features">15-Digit Luhn IMEI Validator</a></li>
                <li><a href="#pricing">Subscription Packages</a></li>
                <li><a href="#faq">Hardware Compatibility</a></li>
                <li><a href="#faq">Thermal Receipt Printers</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Support & Contact</h4>
              <ul>
                <li><strong>Helpline:</strong> +92 (300) 123-4567</li>
                <li><strong>WhatsApp:</strong> +92 (300) 765-4321</li>
                <li><strong>Email:</strong> support@digitalmarkaz360.local</li>
                <li><strong>Hours:</strong> Mon - Sat: 10:00 AM - 10:00 PM</li>
                <li><strong>Major Hubs:</strong> Lahore • Karachi • Rawalpindi</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>
              &copy; {new Date().getFullYear()} DigitalMarkaz360 Technologies Pvt Ltd. All rights reserved.
            </div>
            <div className="footer-bottom-links">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Security Standards</span>
              <span className="build-tag">v2.4.5-enterprise</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          12. 1-CLICK INTERACTIVE DEMO MODAL
          ========================================================================= */}
      {showDemoModal && (
        <div className="demo-modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="demo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="demo-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Instant 1-Click Demo Access</h3>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    Select a role to test the live application immediately:
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="demo-close-btn"
                onClick={() => setShowDemoModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="demo-roles-grid">
              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("admin")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon">👔</span>
                  <span className="demo-role-tag admin">Recommended</span>
                </div>
                <strong>Company Administrator</strong>
                <span className="demo-role-email">admin@mobilepos.local</span>
                <p>Full company oversight, multi-branch settings, financial reports & staff permissions.</p>
                <div className="demo-launch-label">Launch Admin Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("manager")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon">🏪</span>
                  <span className="demo-role-tag branch">Branch Portal</span>
                </div>
                <strong>Branch Manager</strong>
                <span className="demo-role-email">manager@mobilepos.local</span>
                <p>Branch operations, IMEI inventory, purchases, stock transfers, and shift close.</p>
                <div className="demo-launch-label">Launch Manager Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("cashier")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon">💳</span>
                  <span className="demo-role-tag cashier">Counter Staff</span>
                </div>
                <strong>Counter Cashier</strong>
                <span className="demo-role-email">cashier@mobilepos.local</span>
                <p>Rapid POS counter checkout, customer Udhar Khata payments, and thermal receipts.</p>
                <div className="demo-launch-label">Launch Cashier Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("top_admin")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon">🛡️</span>
                  <span className="demo-role-tag saas">Platform Owner</span>
                </div>
                <strong>SaaS Top Admin</strong>
                <span className="demo-role-email">topadmin@mobilepos.local</span>
                <p>Multi-tenant SaaS platform management, package creation, and tenant subscriptions.</p>
                <div className="demo-launch-label">Launch SaaS Owner Portal →</div>
              </button>
            </div>

            <div className="demo-modal-footer">
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Prefer to enter credentials manually?
              </span>
              <button
                type="button"
                className="landing-btn-ghost"
                onClick={() => {
                  setShowDemoModal(false);
                  onGoToLogin();
                }}
              >
                Standard Login Form →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
