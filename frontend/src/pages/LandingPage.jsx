import { useState, useMemo, useEffect } from "react";
import {
  Sun,
  Moon,
  PlayCircle,
  Play,
  ShoppingCart,
  RotateCcw,
  Smartphone,
  Package,
  Wrench,
  Wallet,
  BookOpen,
  Building2,
  ArrowLeftRight,
  PieChart,
  Users,
  BarChart3,
  Truck,
  Printer,
  FileText,
  Receipt,
  ShieldCheck,
  MessageSquare,
  CheckCircle2,
  Lock,
  Store,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap
} from "lucide-react";

export function LandingPage({ onGoToLogin, onQuickDemoLogin }) {
  // Navigation & Theme State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'annual'
  const [openFaq, setOpenFaq] = useState(0); // First question expanded by default
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState("product-overview");

  // ---------------------------------------------------------------------------
  // LANGUAGE & ORIENTATION: Landing page operates strictly in English (LTR)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      document.documentElement.setAttribute("data-lang", "en");
      if (typeof document !== "undefined" && document.body) {
        document.body.classList.add("lang-en");
        document.body.classList.remove("lang-ur");
      }
    } catch {
      // Safe fallback
    }
  }, []);

  // ---------------------------------------------------------------------------
  // THEME MANAGEMENT: Animated Day / Night Switch with Auto-Timezone
  // ---------------------------------------------------------------------------
  const computeAutoTheme = () => {
    try {
      const localHour = new Date().getHours();
      if (typeof localHour === "number" && !isNaN(localHour)) {
        return localHour >= 6 && localHour < 19 ? "day" : "night";
      }
    } catch (e) {}

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions?.().timeZone;
      const hourStr = new Intl.DateTimeFormat("en-US", {
        ...(tz ? { timeZone: tz } : {}),
        hour: "numeric",
        hourCycle: "h23",
        hour12: false
      }).format(new Date());
      const hour = parseInt(hourStr, 10);
      if (!isNaN(hour)) {
        return hour >= 6 && hour < 19 ? "day" : "night";
      }
    } catch (e) {}

    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "day";
    }
    return "night";
  };

  const getInitialThemeState = () => {
    try {
      const saved = localStorage.getItem("dm360-theme-mode");
      if (saved === "day" || saved === "night") {
        return { theme: saved, isAuto: false };
      }
    } catch (e) {}

    if (typeof document !== "undefined") {
      const domTheme = document.documentElement.getAttribute("data-theme");
      if (domTheme === "day" || domTheme === "night") {
        return { theme: domTheme, isAuto: true };
      }
    }
    return { theme: computeAutoTheme(), isAuto: true };
  };

  const [{ theme, isAuto }, setThemeState] = useState(getInitialThemeState);
  const [canAnimate, setCanAnimate] = useState(false);

  // Enable animation after initial paint (prevents initial slide animation on load)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanAnimate(true);
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("theme-preload");
      }
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Sync theme to DOM and handle auto timezone boundary re-checks (15m + visibility/focus)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme-auto", isAuto ? "true" : "false");

    if (!isAuto) return;

    const checkAutoBoundary = () => {
      const calculated = computeAutoTheme();
      setThemeState((prev) => {
        if (!prev.isAuto) return prev;
        if (prev.theme !== calculated) {
          document.documentElement.setAttribute("data-theme", calculated);
          return { theme: calculated, isAuto: true };
        }
        return prev;
      });
    };

    // Re-check every 15 minutes
    const interval = setInterval(checkAutoBoundary, 15 * 60 * 1000);

    // Re-check when window regains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAutoBoundary();
      }
    };
    const handleFocus = () => {
      checkAutoBoundary();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuto, theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === "night" ? "day" : "night";
    setThemeState({ theme: nextTheme, isAuto: false });
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.setAttribute("data-theme-auto", "false");
    try {
      localStorage.setItem("dm360-theme-mode", nextTheme);
    } catch (e) {}
  };

  const handleResetToAuto = () => {
    try {
      localStorage.removeItem("dm360-theme-mode");
    } catch (e) {}
    const autoTheme = computeAutoTheme();
    setThemeState({ theme: autoTheme, isAuto: true });
    document.documentElement.setAttribute("data-theme", autoTheme);
    document.documentElement.setAttribute("data-theme-auto", "true");
  };

  // ---------------------------------------------------------------------------
  // 3 DISTINCT PRODUCT VIDEOS SHOWCASE (WITH POSTERS & MATCHING DURATIONS)
  // ---------------------------------------------------------------------------
  const showcaseVideos = [
    {
      id: "product-overview",
      optionNumber: 1,
      title: "Full HD 1080p Product Overview",
      subtitle: "Official Launch & Feature Walkthrough",
      badge: "Option 1 • 1080p 60FPS",
      aspectRatio: "16:9",
      duration: "0:18",
      src: "/videos/digitalmarkaz360_product_intro.webm",
      poster: "/videos/digitalmarkaz360_product_intro_poster.webp",
      IconComponent: PlayCircle,
      tagColor: "#38bdf8",
      description: "High-framerate animated product trailer with electronic synth audio, live dashboard metrics, POS checkout, IMEI laser barcode scan, and security vault.",
      highlights: ["Live Sales Analytics", "IMEI Laser Scanner", "Instant Receipt Generation", "Executive Obsidian Theme"]
    },
    {
      id: "mobile-reel",
      optionNumber: 2,
      title: "Mobile POS & Retail Handset Scanner",
      subtitle: "Vertical Reel • Smartphone Experience",
      badge: "Option 2 • Mobile 9:16 Reel",
      aspectRatio: "9:16",
      duration: "0:12",
      src: "/videos/digitalmarkaz360_mobile_reel.webm",
      poster: "/videos/digitalmarkaz360_mobile_reel_poster.webp",
      IconComponent: Smartphone,
      tagColor: "#10b981",
      description: "High-speed retail workflow optimized for smartphones and handheld tablets. Real-time customer khata ledger updates, instant IMEI verification, and WhatsApp receipts.",
      highlights: ["Pocket POS Interface", "Camera Barcode Intake", "WhatsApp Claim Slips", "Handset PTA Check"]
    },
    {
      id: "enterprise-security",
      optionNumber: 3,
      title: "Top Admin Security Vault & Multi-Branch",
      subtitle: "Zero-Trust Architecture & Accounting",
      badge: "Option 3 • Enterprise Deep Dive",
      aspectRatio: "16:9",
      duration: "0:14",
      src: "/videos/digitalmarkaz360_enterprise_security.webm",
      poster: "/videos/digitalmarkaz360_enterprise_security_poster.webp",
      IconComponent: ShieldCheck,
      tagColor: "#f59e0b",
      description: "Military-grade authentication vault deep dive: 2FA TOTP hardware sync, session theft mitigation, break-glass admin, and 100% partner dividend split math.",
      highlights: ["Hardware-Grade 2FA (TOTP)", "Emergency Lock Token", "Inter-Branch Stock Transfer", "100% Partner Dividend Math"]
    }
  ];

  const activeVideo = showcaseVideos.find((v) => v.id === activeVideoId) || showcaseVideos[0];

  // ---------------------------------------------------------------------------
  // INTERACTIVE LIVE POS TERMINAL SIMULATOR STATE
  // ---------------------------------------------------------------------------
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

  // Handset catalog for simulator (Emojis preserved inside product list only)
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

  // ---------------------------------------------------------------------------
  // ALL 18 INTEGRATED ENTERPRISE MODULES (WITH DESIGNED LUCIDE ICONS)
  // ---------------------------------------------------------------------------
  const moduleCategories = [
    { key: "all", label: "All Modules (18)" },
    { key: "pos", label: "POS & Sales (4)" },
    { key: "inventory", label: "Inventory & IMEI (4)" },
    { key: "finance", label: "Khata & Financials (5)" },
    { key: "operations", label: "Branches & HR (5)" }
  ];

  const allModules = [
    // --- POS & SALES (4) ---
    {
      category: "pos",
      IconComponent: ShoppingCart,
      title: "Point-of-Sale Sales Counter",
      tag: "Core POS",
      desc: "Blazing fast sales counter with barcode & 15-digit IMEI scanner support, quick customer creation, partial payments, and split payment modes.",
      highlights: ["Instant IMEI verification", "Thermal 80mm & 58mm receipts", "Barcode scanner ready"]
    },
    {
      category: "pos",
      IconComponent: RotateCcw,
      title: "Customer Sale Returns & Refunds",
      tag: "Returns & Restock",
      desc: "Full IMEI tracking on customer returns. Automatically restore returned handsets into branch stock, issue cash refunds, or update customer credit ledger.",
      highlights: ["Automatic IMEI stock restoration", "Customer ledger adjustment", "Voided transaction trace"]
    },
    {
      category: "pos",
      IconComponent: Wrench,
      title: "Repair Workshop & Technician Desk",
      tag: "Service Center",
      desc: "Device intake ticketing, diagnostic checklists, technician job assignment, spare parts used, labor fees, and customer repair claim slips with barcodes.",
      highlights: ["Repair claim slip with barcode", "Technician commission tracking", "Spare parts stock deduction"]
    },
    {
      category: "pos",
      IconComponent: FileText,
      title: "Quotations & Proforma Invoices",
      tag: "Sales Quotes",
      desc: "Generate professional price estimates and corporate proforma invoices. Convert accepted quotations into confirmed POS sales orders with one click.",
      highlights: ["1-click quote-to-sale conversion", "Custom quotation expiry dates", "WhatsApp & PDF quotation export"]
    },

    // --- INVENTORY & IMEI (4) ---
    {
      category: "inventory",
      IconComponent: Smartphone,
      title: "Serialized IMEI Mobile Inventory",
      tag: "Handset Tracking",
      desc: "Comprehensive smartphone unit tracker with 15-digit IMEI validation, warranty status, PTA verification, purchase cost history, and lifecycle audit.",
      highlights: ["Unique IMEI duplicate prevention", "Color & storage variant tags", "Handset profit margin calc"]
    },
    {
      category: "inventory",
      IconComponent: Package,
      title: "Non-Serialized Accessories Catalog",
      tag: "Barcode & Stock",
      desc: "Stock tracking for chargers, cases, power banks, and tempered glasses. Set minimum alert levels, generate SKU barcodes, and bulk reorder.",
      highlights: ["Low stock warning threshold", "Automatic barcode generation", "Opening stock valuation"]
    },
    {
      category: "inventory",
      IconComponent: Truck,
      title: "Wholesale Purchases & PO Intake",
      tag: "Vendor Orders",
      desc: "Manage vendor purchase orders, receive supplier shipments, scan bulk handset IMEIs into stock, and auto-update vendor payable balances.",
      highlights: ["Bulk IMEI batch import", "Supplier invoice matching", "Average unit cost tracking"]
    },
    {
      category: "inventory",
      IconComponent: Printer,
      title: "Barcode & QR Code Printing Engine",
      tag: "Label Printing",
      desc: "Print custom product stickers and IMEI barcode labels directly on standard thermal sticker printers (TSC, Xprinter, Zebra) with customizable layouts.",
      highlights: ["Custom sticker dimensions", "High-density 1D & 2D barcodes", "Batch label print queues"]
    },

    // --- KHATA & FINANCIALS (5) ---
    {
      category: "finance",
      IconComponent: Wallet,
      title: "Cash Register & Shift Reconciliation",
      tag: "Zero Theft",
      desc: "Strict counter accountability. Opening cash balance, real-time in/out logging, denomination counts, and shift closing verification to stop counter leakage.",
      highlights: ["Blind cashier closing audits", "Denomination breakdown grid", "Cash drop & petty cash log"]
    },
    {
      category: "finance",
      IconComponent: BookOpen,
      title: "Customer & Vendor Khata Ledgers",
      tag: "Parties Khata",
      desc: "Digital Udhar / Khata management with credit limits, installment recording, transaction history, aging receivables, and WhatsApp payment reminders.",
      highlights: ["Direct WhatsApp Khata statements", "Customer & vendor credit limits", "Installment payment receipts"]
    },
    {
      category: "finance",
      IconComponent: PieChart,
      title: "Partner Equity & Branch Dividends",
      tag: "Partnership",
      desc: "Capital contributions, partner drawings, and automated branch profit sharing with strict 100% equity validation. Clean financial ledgers for all partners.",
      highlights: ["Strict 100% equity sum check", "Automatic dividend disbursement", "Partner capital & drawing ledger"]
    },
    {
      category: "finance",
      IconComponent: Receipt,
      title: "Expense Management & Petty Cash",
      tag: "Shop Overheads",
      desc: "Log and categorize daily operational overheads including shop rent, electricity, marketing, tea/refreshments, and generator fuel with receipt attachments.",
      highlights: ["Expense categories & budget caps", "Petty cash voucher generation", "P&L expense deduction"]
    },
    {
      category: "finance",
      IconComponent: BarChart3,
      title: "Real-Time Profit/Loss & Audits",
      tag: "Analytics",
      desc: "Instant visibility into daily sales, gross margin, operating expenses, dead inventory alerts, cash flow, and comprehensive audit trails.",
      highlights: ["Real-time net profit calculation", "Dead-stock & aging report", "Export to Excel & PDF"]
    },

    // --- BRANCHES & HR (5) ---
    {
      category: "operations",
      IconComponent: Store,
      title: "Multi-Branch Outlets & Branch Switcher",
      tag: "Multi-Store",
      desc: "Centralized control for multi-outlet phone shops. Manage Main Branch, Mall Outlet, and Wholesale Hub with independent inventories and central dashboard.",
      highlights: ["Real-time multi-branch metrics", "Per-branch subscription isolation", "Instant branch switching"]
    },
    {
      category: "operations",
      IconComponent: ArrowLeftRight,
      title: "Inter-Branch Stock Transfers",
      tag: "Stock Logistics",
      desc: "Safely transfer high-value handsets and accessories between branches. Includes dispatch confirmation, in-transit state, and destination manager acceptance.",
      highlights: ["Two-step transfer verification", "In-transit IMEI audit trail", "Zero inventory phantom loss"]
    },
    {
      category: "operations",
      IconComponent: Users,
      title: "Employee Salaries, Attendance & Advances",
      tag: "Staff & Payroll",
      desc: "Staff attendance roster, salary advance disbursements, automatic advance deduction on month-end, and 1-click batch payroll approval.",
      highlights: ["Daily attendance calendar", "Automatic advance deductions", "Batch salary distribution"]
    },
    {
      category: "operations",
      IconComponent: ShieldCheck,
      title: "Role-Based Access Control (RBAC)",
      tag: "Security Vault",
      desc: "Fine-grained permission policies for Admins, Branch Managers, Cashiers, and Technicians. Prevent staff from viewing costs, discounts, or modifying past sales.",
      highlights: ["Granular module permissions", "Immutable action audit logs", "Session security & 2FA"]
    },
    {
      category: "operations",
      IconComponent: MessageSquare,
      title: "Automated WhatsApp & SMS Gateway",
      tag: "Customer Engagement",
      desc: "Direct customer communication channel. Send automatic digital purchase receipts, repair status updates, and friendly payment reminders straight to WhatsApp.",
      highlights: ["Instant WhatsApp thermal receipt", "Repair ticket ready alerts", "Automated payment reminder messages"]
    }
  ];

  const filteredModules = useMemo(() => {
    if (selectedCategory === "all") return allModules;
    return allModules.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  // Frequently Asked Questions
  const faqs = [
    {
      q: "Does DigitalMarkaz360 work with any barcode scanner or POS printer?",
      a: "Yes! DigitalMarkaz360 works with standard 80mm and 58mm thermal receipt printers (Epson, Xprinter, Rongta, Star, etc.) via USB, Bluetooth, or LAN, as well as regular A4 laser printers. It also natively supports all 1D/2D USB and wireless barcode scanners."
    },
    {
      q: "Can I print receipts on standard thermal POS printers?",
      a: "Yes! DigitalMarkaz360 supports standard 80mm and 58mm thermal receipt printers via USB, Bluetooth, or LAN, as well as full-page A4 PDF invoices. Thermal receipts include your shop name, logo, phone number, IMEI numbers, warranty terms, and QR/barcodes."
    },
    {
      q: "Can I manage phone repairs and technician commissions?",
      a: "Absolutely! Our Repair Service Workshop module lets you create repair tickets with fault diagnosis, record customer phone passcodes, assign specific technicians, log spare parts used from your inventory, track labor charges, and print professional claim slips with barcodes."
    },
    {
      q: "How does partner equity and profit-sharing work?",
      a: "Our Partnership Equity module guarantees that all partner equity shares always total exactly 100%. When you distribute branch profits, dividends are calculated automatically based on each partner's agreed percentage and logged into dedicated partner ledgers."
    },
    {
      q: "Is my shop data isolated and safe from other shops?",
      a: "Yes. DigitalMarkaz360 is built on an enterprise multi-tenant architecture with tenant isolation. Your businesses, branches, products, customer lists, and financial records are strictly isolated at both database and application layers."
    }
  ];

  // Testimonials with client shop logos & avatars
  const testimonials = [
    {
      stars: "★★★★★",
      quote: "Before DigitalMarkaz360, my staff spent 3 hours every evening reconciling IMEI serials. With this software, every sale scans in seconds and the cash drawer matches to the exact rupee at shift close.",
      author: "Haji Tariq Mahmood",
      shop: "Al-Rehman Mobile Center • Hafeez Centre, Lahore",
      logo: "/clients/al_rehman_mobile.png",
      initials: "TM",
      color: "#0ea5e9"
    },
    {
      stars: "★★★★★",
      quote: "The repair lab module alone paid for the system in one month. We track diagnostic tickets, spare parts used, and customer claim slips with barcodes. No more lost phones or customer disputes.",
      author: "Kashif Siddiqui",
      shop: "Metro Mobile Hub • Saddar Mobile Market, Karachi",
      logo: "/clients/metro_mobile_hub.png",
      initials: "KS",
      color: "#10b981"
    },
    {
      stars: "★★★★★",
      quote: "Managing our 3 branches was a nightmare. Now with Inter-Branch Stock Transfers and central dashboard, I see all sales and inventory from my home. The partner equity module makes dividend sharing 100% fair.",
      author: "Engr. Farhan Malik",
      shop: "Digital Tech Outlets • Singapore Plaza, Rawalpindi",
      logo: "/clients/digital_tech_outlets.png",
      initials: "FM",
      color: "#8b5cf6"
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
            <a href="#video-tour" style={{ color: "var(--dm-accent)", fontWeight: 700 }}>🎬 Videos</a>
            <a href="#features">Features</a>
            <a href="#pos-demo">Live POS Demo</a>
            <a href="#imei-workshop">IMEI & Repairs</a>
            <a href="#modules">All Modules</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-right">
            {/* One simple, modern, ANIMATED toggle switch: only theme control on the page */}
            <div className="landing-theme-switch-wrapper">
              <button
                type="button"
                role="switch"
                aria-checked={theme === "night" ? "true" : "false"}
                aria-label="Switch day/night theme"
                title={theme === "night" ? "Night mode — tap for Day" : "Day mode — tap for Night"}
                className={`theme-toggle-switch ${theme === "night" ? "is-night" : "is-day"} ${canAnimate ? "can-animate" : "no-animate"}`}
                onClick={handleToggleTheme}
              >
                <span className="theme-switch-track">
                  <span className="theme-switch-knob">
                    <Sun className="theme-icon theme-icon-sun" size={14} aria-hidden="true" />
                    <Moon className="theme-icon theme-icon-moon" size={14} aria-hidden="true" />
                  </span>
                </span>
              </button>
              {isAuto ? (
                <button
                  type="button"
                  className="theme-auto-badge"
                  onClick={handleResetToAuto}
                  title="Auto Day/Night mode active (06:00–18:59 Day, 19:00–05:59 Night) • Click to re-sync"
                  aria-label="Automatic day/night mode active"
                >
                  AUTO
                </button>
              ) : (
                <button
                  type="button"
                  className="theme-reset-auto-btn"
                  onClick={handleResetToAuto}
                  title="Reset to automatic Day/Night mode based on time of day"
                  aria-label="Reset to automatic day/night mode"
                >
                  Auto ↺
                </button>
              )}
            </div>

            <button
              type="button"
              className="landing-btn-ghost landing-btn-login"
              onClick={onGoToLogin}
              title="Sign in to your account"
            >
              Login
            </button>

            <button
              type="button"
              className="landing-btn-primary landing-btn-demo desktop-only"
              onClick={() => setShowDemoModal(true)}
              title="Launch 1-Click Interactive Demo"
            >
              <Zap size={15} />
              <span>Launch Demo</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-dropdown">
            <a href="#video-tour" onClick={() => setMobileMenuOpen(false)} style={{ color: "var(--dm-accent)", fontWeight: 700 }}>🎬 Videos</a>
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
          2. HERO SECTION
          ========================================================================= */}
      <section className="landing-hero">
        <div className="hero-glow-blob blob-teal" />
        <div className="hero-glow-blob blob-purple" />

        <div className="hero-container">
          <div className="hero-announcement-pill">
            <span className="pill-dot" />
            <span>Pakistan&apos;s #1 Dedicated Mobile Shop & Multi-Branch POS SaaS</span>
            <span className="pill-badge">v2.5 Enterprise</span>
          </div>

          <h1 className="hero-title">
            Poora Karobar, Ek Markaz.
            <span className="hero-gradient-text">Complete Cloud ERP, Serialized IMEI & POS System</span>
          </h1>

          <p className="hero-description">
            Say goodbye to messy paper khatas, lost repair slips, and counter cash shortages.
            DigitalMarkaz360 delivers serialized smartphone tracking, instant thermal POS receipts,
            repair workshop ticketing, partner equity splits, and multi-branch synchronization in one elegant cloud platform.
          </p>

          {/* Hero CTAs: Exactly Two Buttons + Text Link below */}
          <div className="hero-cta-group">
            <button
              type="button"
              className="hero-btn-cta primary"
              onClick={() => setShowDemoModal(true)}
            >
              <PlayCircle size={18} />
              <span>Launch 1-Click Interactive Demo</span>
            </button>
            <a href="#video-tour" className="hero-btn-cta secondary">
              <Play size={18} />
              <span>Watch Video Tour</span>
            </a>
          </div>

          {/* POS Sublink under the buttons */}
          <div className="hero-pos-sublink-wrap">
            <a href="#pos-demo" className="hero-pos-sublink">
              or try the live POS terminal below ↓
            </a>
          </div>

          {/* Quick metric trust badges with Lucide icons */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <span className="trust-icon"><ShieldCheck size={20} /></span>
              <div>
                <strong>Tenant Isolated</strong>
                <span>Bank-grade security</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon"><Smartphone size={20} /></span>
              <div>
                <strong>15-Digit IMEI</strong>
                <span>Serialized Luhn audit</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon"><Printer size={20} /></span>
              <div>
                <strong>Thermal & A4 Invoices</strong>
                <span>80mm, 58mm & PDF</span>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon"><PieChart size={20} /></span>
              <div>
                <strong>100% Equity Math</strong>
                <span>Automated partner dividends</span>
              </div>
            </div>
          </div>

          {/* Isometric Hero Showcase Mockup with Enlarged Desktop Stat Badges */}
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
                <div className="badge-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div className="badge-subtitle">Today&apos;s Gross Sales</div>
                  <div className="badge-main">PKR 485,900</div>
                  <div className="badge-trend">+18.4% vs last week • 28 Invoices</div>
                </div>
              </div>

              <div className="floating-badge badge-bottom-right">
                <div className="badge-icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "var(--dm-accent)" }}>
                  <Smartphone size={22} />
                </div>
                <div>
                  <div className="badge-subtitle">Handset Stock Live</div>
                  <div className="badge-main">1,248 Verified IMEIs</div>
                  <div className="badge-trend" style={{ color: "var(--dm-accent)" }}>100% In Stock & Verified</div>
                </div>
              </div>

              <div className="floating-badge badge-top-right">
                <div className="badge-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                  <Store size={22} />
                </div>
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
          3. VIDEO SHOWCASE THEATER (3 SEPARATE PRODUCT INTRO VIDEOS WITH POSTERS)
          ========================================================================= */}
      <section className="landing-section video-showcase-section" id="video-tour">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">🎬 Product Video Showcase</div>
            <h2 className="section-title">See DigitalMarkaz360 in Action</h2>
            <p className="section-subtitle">
              Watch our 3 official product walkthroughs. Explore high-speed point-of-sale checkout,
              serialized IMEI tracking, vertical smartphone mobile POS, and bank-grade security architecture.
            </p>
          </div>

          {/* Video Selection Tabs */}
          <div className="video-tabs-wrapper">
            {showcaseVideos.map((vid) => {
              const isActive = vid.id === activeVideo.id;
              const VideoIcon = vid.IconComponent;
              return (
                <button
                  key={vid.id}
                  type="button"
                  className={`video-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => setActiveVideoId(vid.id)}
                >
                  <VideoIcon size={18} />
                  <span>{vid.title}</span>
                  <span className="video-tab-badge">{vid.duration}</span>
                </button>
              );
            })}
          </div>

          {/* Theater Screen Frame */}
          <div className="video-theater-wrapper">
            <div className={`video-player-container ${activeVideo.aspectRatio === "9:16" ? "portrait" : "landscape"}`}>
              <video
                key={activeVideo.id}
                src={activeVideo.src}
                poster={activeVideo.poster}
                controls
                playsInline
                autoPlay
                loop
                title={activeVideo.title}
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>

            {/* Video Meta Info Bar */}
            <div className="video-meta-bar">
              <div className="video-meta-details">
                <div className="video-meta-title-row">
                  <h3 className="video-meta-title">{activeVideo.title}</h3>
                  <span className="video-tab-badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: activeVideo.tagColor, border: `1px solid ${activeVideo.tagColor}` }}>
                    {activeVideo.badge} • {activeVideo.duration}
                  </span>
                </div>
                <p className="video-meta-desc">{activeVideo.description}</p>
                <div className="video-meta-pills">
                  {activeVideo.highlights.map((h, idx) => (
                    <span key={idx} className="video-feature-pill">✓ {h}</span>
                  ))}
                </div>
              </div>
              <div>
                <a
                  href={activeVideo.src}
                  download
                  className="video-download-btn"
                  title="Download Video File"
                >
                  <span>⬇</span>
                  <span>Download Video ({activeVideo.aspectRatio})</span>
                </a>
              </div>
            </div>
          </div>

          {/* 3-Video Gallery Grid with Designed Posters */}
          <div className="video-card-grid">
            {showcaseVideos.map((vid) => {
              const isSelected = vid.id === activeVideo.id;
              const CardIcon = vid.IconComponent;
              return (
                <div
                  key={vid.id}
                  className={`video-grid-card ${isSelected ? "active-card" : ""}`}
                  onClick={() => {
                    setActiveVideoId(vid.id);
                    const el = document.getElementById("video-tour");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <div className={`video-card-preview-thumb ${vid.aspectRatio === "9:16" ? "portrait-thumb" : ""}`}>
                    <img src={vid.poster} alt={vid.title} className="video-thumb-img" />
                    <div className="video-card-play-icon">▶</div>
                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: "rgba(0,0,0,0.8)",
                        color: "#f8fafc",
                        fontWeight: 700,
                        border: "1px solid rgba(255,255,255,0.2)",
                        zIndex: 3
                      }}
                    >
                      {vid.duration}
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "10px",
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: vid.tagColor,
                        color: "#020617",
                        fontWeight: 800,
                        zIndex: 3
                      }}
                    >
                      {vid.badge.split("•")[0].trim()}
                    </span>
                  </div>

                  <div>
                    <h4 className="video-card-title">{vid.title}</h4>
                    <p className="video-card-desc">{vid.subtitle}</p>
                  </div>

                  <div className="video-card-footer">
                    <span style={{ color: "var(--dm-accent)", fontWeight: 700 }}>
                      {isSelected ? "● Currently Playing" : "▶ Click to Watch"}
                    </span>
                    <span style={{ color: "var(--dm-text-muted)" }}>{vid.aspectRatio} Aspect</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. INTERACTIVE LIVE POS SIMULATOR (TRY BEFORE YOU BUY)
          ========================================================================= */}
      <section className="landing-section pos-demo-section" id="pos-demo">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Interactive Live Simulator</div>
            <h2 className="section-title">Try The Real POS Counter Right Now</h2>
            <p className="section-subtitle">
              Click handsets or accessories to populate the live cart, adjust discounts, and test real-time thermal receipt generation.
            </p>
          </div>

          <div className="pos-simulator-container">
            {/* Left Panel: POS Counter Interface */}
            <div className="pos-counter-card">
              <div className="pos-counter-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--dm-text-heading)" }}>
                    Express Sales Terminal #01
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--dm-text-muted)" }}>
                    Branch: Main Hafeez Centre • Operator: Ali Raza
                  </div>
                </div>
                <div className="live-pulse-badge">
                  <span className="pill-dot" style={{ width: 6, height: 6 }} />
                  <span>SIMULATOR LIVE</span>
                </div>
              </div>

              {/* Quick-add Product Catalog (Handsets & Accessories) */}
              <label className="pos-input-label">Click Item to Add to Bill</label>
              <div className="pos-catalog-grid">
                {sampleProducts.map((p) => {
                  const isAdded = cartItems.some((ci) => (p.type === "handset" ? ci.imei === p.imei : ci.id === p.id));
                  return (
                    <div
                      key={p.id}
                      className={`pos-product-tile ${isAdded ? "added" : ""}`}
                      onClick={() => handleAddSampleItem(p)}
                    >
                      <span className="tile-icon">{p.icon}</span>
                      <div className="tile-info">
                        <strong>{p.name}</strong>
                        <span>PKR {p.price.toLocaleString()}</span>
                      </div>
                      <div className="tile-add-btn">{isAdded ? "✓ Added" : "+ Add"}</div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Items List */}
              <div className="pos-cart-section">
                <div className="pos-cart-header">
                  <span>Current Cart ({cartItems.length} items)</span>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      className="link-btn-clear"
                      onClick={() => {
                        setCartItems([]);
                        setPosReceiptPrinted(false);
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="pos-empty-cart">
                    <span>🛒</span>
                    <p>Your cart is empty. Click any item above to start testing.</p>
                  </div>
                ) : (
                  <div className="pos-cart-list">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="pos-cart-row">
                        <div className="cart-row-main">
                          <strong>{item.name}</strong>
                          {item.imei ? (
                            <div className="cart-row-imei">
                              IMEI: <code>{item.imei}</code> (PTA Validated)
                            </div>
                          ) : (
                            <div className="cart-row-type">Standard Non-serialized Item (Qty: {item.qty})</div>
                          )}
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
                  <Printer size={18} />
                  <span>Confirm & Print Thermal Receipt</span>
                </button>
              </div>
            </div>

            {/* Right Panel: Thermal Receipt Live Simulation (Always White Paper) */}
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
                    <div><strong>Customer:</strong> {posCustomerName || "Muhammad Bilal (Walk-in)"}</div>
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
                      <span style={{ color: "#10b981" }}>- PKR {posDiscount.toLocaleString()}</span>
                    </div>
                    <div className="summary-line total">
                      <strong>Total Net:</strong>
                      <strong>PKR {posTotal.toLocaleString()}</strong>
                    </div>
                    <div className="summary-line" style={{ marginTop: "4px" }}>
                      <span>Paid Mode:</span>
                      <span style={{ textTransform: "capitalize" }}>{posPaymentMethod}</span>
                    </div>
                  </div>

                  <div className="receipt-divider" />

                  <div className="receipt-barcode-box">
                    <div className="barcode-bars" />
                    <div className="barcode-number">*INV-2026-0894*</div>
                  </div>

                  <div className="receipt-footer-text">
                    *** THANK YOU FOR YOUR BUSINESS ***<br />
                    Handsets sold with official warranty.<br />
                    Powered by DigitalMarkaz360 Cloud POS
                  </div>
                </div>

                {posReceiptPrinted && (
                  <div className="receipt-printed-overlay">
                    <div className="success-check">✓</div>
                    <h4 style={{ margin: "8px 0 4px", fontSize: "1.2rem", fontWeight: 800 }}>
                      Receipt Printed!
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>
                      ESC/POS 80mm command transmitted successfully to thermal print spooler.
                    </p>
                    <button
                      type="button"
                      className="landing-btn-ghost"
                      style={{ marginTop: "1rem", background: "rgba(0,0,0,0.25)", color: "#fff", border: "1px solid #fff" }}
                      onClick={() => setPosReceiptPrinted(false)}
                    >
                      Dismiss Overlay
                    </button>
                  </div>
                )}
              </div>
              <div className="receipt-paper-bottom" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. DEDICATED MOBILE ARCHITECTURE & IMEI WORKSHOP
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
                  <div className="pillar-icon"><Smartphone size={24} /></div>
                  <div>
                    <h4>Dual-Item Inventory Engine</h4>
                    <p>
                      Track serialized smartphones with unique 15-digit IMEIs, purchase cost, color, and warranty,
                      alongside non-serialized accessories (chargers, cases, cables) tracked by barcode and reorder thresholds.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><Wrench size={24} /></div>
                  <div>
                    <h4>Repair Lab & Technician Desk</h4>
                    <p>
                      Complete device intake workflow. Record customer passcodes, diagnostic checks, assign technicians,
                      deduct spare parts (screens, batteries), charge labor, and print claim tickets with barcodes.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><Wallet size={24} /></div>
                  <div>
                    <h4>Cash Drawer & Shift Reconciliation</h4>
                    <p>
                      Stop counter cash leakage. Enforce opening balances, track mid-shift cash drops, and require
                      physical cash denomination counts before closing any cashier shift.
                    </p>
                  </div>
                </div>

                <div className="pillar-item">
                  <div className="pillar-icon"><ArrowLeftRight size={24} /></div>
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
                  <span><Zap size={22} /></span>
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
          6. COMPLETE ENTERPRISE MODULE CATALOG (EXACTLY 18 MODULES)
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
            {filteredModules.map((mod, idx) => {
              const ModIcon = mod.IconComponent;
              return (
                <div key={idx} className="module-card">
                  <div className="module-card-top">
                    <span className="module-icon"><ModIcon size={22} /></span>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. COMPARISON MATRIX: DIGITALMARKAZ360 VS SPREADSHEETS & LEGACY POS
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
                  <td><span className="warn-badge">⚠️ Basic totals only</span></td>
                  <td><span className="cross-badge">❌ Frequent shortages</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Inter-Branch Stock Transit Audit</strong>
                    <span>Dispatch status, in-transit state, manager receipt accept</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Dual-Verify Gates</span></td>
                  <td><span className="cross-badge">❌ Single store only</span></td>
                  <td><span className="cross-badge">❌ Zero accountability</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Customer Khata & WhatsApp Slips</strong>
                    <span>Digital ledger, credit limits, direct WhatsApp statements</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Built-in Ledger</span></td>
                  <td><span className="warn-badge">⚠️ Costly 3rd party SMS</span></td>
                  <td><span className="cross-badge">❌ Uncollected debt</span></td>
                </tr>
                <tr>
                  <td>
                    <strong>Automated Partner Equity & Dividends</strong>
                    <span>Strict 100% equity validation & automated profit disbursement</span>
                  </td>
                  <td className="highlight-col"><span className="check-badge">✅ Automated Splits</span></td>
                  <td><span className="cross-badge">❌ Not supported</span></td>
                  <td><span className="cross-badge">❌ Partner disputes</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. TRANSPARENT PRICING PACKAGES (CENTRED HEADER & CENTRED TOGGLE)
          ========================================================================= */}
      <section className="landing-section pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Clear & Simple Pricing</div>
            <h2 className="section-title">Transparent Packages for Every Stage of Growth</h2>
            <p className="section-subtitle">
              No hidden fees, no complicated contracts. Choose the plan that fits your outlets.
            </p>

            {/* Monthly / Annual Switcher Centred Under Subtext */}
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

            {/* Professional Plan (Featured - Reads clearly in both themes) */}
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
                <div className="p-feat"><span>✓</span> Unlimited Serialized Handset IMEIs</div>
                <div className="p-feat"><span>✓</span> Complete Repair Lab & Claim Slips</div>
                <div className="p-feat"><span>✓</span> Inter-Branch Stock Transfers with Audit</div>
                <div className="p-feat"><span>✓</span> Partner Equity & Branch Profit Sharing</div>
                <div className="p-feat"><span>✓</span> Staff Attendance, Advances & Salaries</div>
                <div className="p-feat"><span>✓</span> WhatsApp Payment Reminders</div>
                <div className="p-feat"><span>✓</span> Role Permissions (Manager, Cashier, Tech)</div>
                <div className="p-feat"><span>✓</span> Priority Phone & WhatsApp Support</div>
              </div>

              <button
                type="button"
                className="pricing-btn primary"
                onClick={() => setShowDemoModal(true)}
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <div className="pricing-card-header">
                <span className="tier-badge">Wholesale & Chains</span>
                <h3 className="tier-name">Enterprise Chain</h3>
                <p className="tier-desc">Custom solution for major phone distributors and retail chains.</p>
                <div className="tier-price">
                  <span className="price-currency">PKR</span>
                  <span className="price-amount">{billingCycle === "annual" ? "5,600" : "7,000"}</span>
                  <span className="price-period">/ month</span>
                </div>
              </div>

              <div className="pricing-features-list">
                <div className="p-feat"><span>✓</span> Unlimited Outlets & Warehouses</div>
                <div className="p-feat"><span>✓</span> Wholesale PO Intake & Bulk IMEI Scanning</div>
                <div className="p-feat"><span>✓</span> Dedicated Central Server Deployment</div>
                <div className="p-feat"><span>✓</span> Automated Nightly Cloud Database Backups</div>
                <div className="p-feat"><span>✓</span> Custom Receipt & Invoice Branding</div>
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
          9. TESTIMONIALS & MOBILE HUB SUCCESS STORIES (CENTRED HEADER & SHOP LOGOS)
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
            {testimonials.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="test-stars">{t.stars}</div>
                <p className="test-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="test-author">
                  {t.logo ? (
                    <img
                      src={t.logo}
                      alt={t.shop}
                      className="author-shop-logo"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                  <div className="author-avatar" style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <strong>{t.author}</strong>
                    <span>{t.shop}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FREQUENTLY ASKED QUESTIONS (ACCORDION - 1ST QUESTION EXPANDED BY DEFAULT)
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
          11. FINAL BOTTOM CTA GRADIENT BANNER
          ========================================================================= */}
      <section className="landing-cta-banner">
        <div className="cta-banner-card">
          <div className="cta-content">
            <span className="cta-badge">Transform Your Retail Outlets Today</span>
            <h2>Ready to Run Your Mobile Shop with Total Control?</h2>
            <p>
              Join 500+ mobile shop owners across Pakistan who stopped cash shortages, eliminated lost IMEI slips,
              and accelerated counter checkout with DigitalMarkaz360.
            </p>
            <div className="cta-buttons-row">
              <button
                type="button"
                className="landing-btn-primary large"
                onClick={() => setShowDemoModal(true)}
              >
                <span>⚡</span>
                <span>Launch 1-Click Interactive Demo</span>
              </button>
              <button
                type="button"
                className="landing-btn-ghost large"
                onClick={onGoToLogin}
              >
                Sign In to Member Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. PROFESSIONAL FOOTER (VALID PUBLIC DOMAIN & REAL CONTACT DETAILS)
          ========================================================================= */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <img src="/logo.png" alt="DigitalMarkaz360 Logo" className="footer-logo" />
                <span className="footer-title">DigitalMarkaz360</span>
              </div>
              <p className="footer-tagline">
                پورا کاروبار، ایک مرکز • Pakistan&apos;s all-in-one cloud retail platform engineered
                exclusively for mobile phone shops, repair centers, and wholesale distributors.
              </p>
              <div className="footer-status-tag">
                <span className="status-live-dot" />
                <span>All Cloud Services Operational</span>
              </div>
            </div>

            <div className="footer-col">
              <h4>Product Capabilities</h4>
              <ul>
                <li><a href="#pos-demo">Live POS Counter Simulator</a></li>
                <li><a href="#video-tour">3-Video Product Showcase</a></li>
                <li><a href="#imei-workshop">Repair Lab & Workshop</a></li>
                <li><a href="#modules">15-Digit IMEI Unit Tracker</a></li>
                <li><a href="#modules">Udhar Khata Ledgers</a></li>
                <li><a href="#modules">Inter-Branch Transfers</a></li>
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
                <li><strong>WhatsApp:</strong> +92 (323) 232-3232</li>
                <li><strong>Email:</strong> support@digitalmarkaz360.com</li>
                <li><strong>Sales:</strong> info@digitalmarkaz360.com</li>
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
              <span className="build-tag">v2.5 Enterprise</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          13. 1-CLICK INTERACTIVE DEMO MODAL
          ========================================================================= */}
      {showDemoModal && (
        <div className="demo-modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="demo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="demo-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Instant 1-Click Demo Access</h3>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--dm-text-muted)" }}>
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
                  <span className="demo-role-icon"><Building2 size={24} color="#38bdf8" /></span>
                  <span className="demo-role-tag admin">Recommended</span>
                </div>
                <strong>Company Administrator</strong>
                <span className="demo-role-email">admin@digitalmarkaz360.com</span>
                <p>Full company oversight, multi-branch settings, financial reports & staff permissions.</p>
                <div className="demo-launch-label">Launch Admin Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("manager")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon"><Store size={24} color="#10b981" /></span>
                  <span className="demo-role-tag branch">Branch Portal</span>
                </div>
                <strong>Branch Manager</strong>
                <span className="demo-role-email">manager@digitalmarkaz360.com</span>
                <p>Branch operations, IMEI inventory, purchases, stock transfers, and shift close.</p>
                <div className="demo-launch-label">Launch Manager Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("cashier")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon"><ShoppingCart size={24} color="#f59e0b" /></span>
                  <span className="demo-role-tag cashier">Counter Staff</span>
                </div>
                <strong>Counter Cashier</strong>
                <span className="demo-role-email">cashier@digitalmarkaz360.com</span>
                <p>Rapid POS counter checkout, customer Udhar Khata payments, and thermal receipts.</p>
                <div className="demo-launch-label">Launch Cashier Portal →</div>
              </button>

              <button
                type="button"
                className="demo-role-card"
                onClick={() => handleLaunchDemoRole("top_admin")}
              >
                <div className="demo-role-top">
                  <span className="demo-role-icon"><ShieldCheck size={24} color="#a78bfa" /></span>
                  <span className="demo-role-tag saas">Platform Owner</span>
                </div>
                <strong>SaaS Top Admin</strong>
                <span className="demo-role-email">topadmin@digitalmarkaz360.com</span>
                <p>Multi-tenant SaaS platform management, package creation, and tenant subscriptions.</p>
                <div className="demo-launch-label">Launch SaaS Owner Portal →</div>
              </button>
            </div>

            <div className="demo-modal-footer">
              <span style={{ fontSize: "0.85rem", color: "var(--dm-text-muted)" }}>
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
