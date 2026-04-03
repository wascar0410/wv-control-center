/**
 * WV Transport & Logistics, LLC — Business Plan
 * Integrated into WV Control Center as /business-plan route
 * Design: Executive Dashboard / Corporate Premium
 * Style: Space Grotesk display + Inter body, Navy/Blue palette, white cards with soft shadows
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// Generate or retrieve a session ID for this browser session
function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem("bp_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("bp_sid", sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/5H4pkNJXcp8hDFeVp3tRuz/hero-bg-eKRvuVqEkdGLoRWYm2FJ27.webp";
const CONTROL_CENTER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/5H4pkNJXcp8hDFeVp3tRuz/control-center-preview-33B6EbuVF3tebRDPX8uHKV.webp";
const FLEET_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/5H4pkNJXcp8hDFeVp3tRuz/cargo-van-fleet-dXWX4wUinH3a6cDEnUHSKa.webp";

// Intersection observer hook for scroll animations
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Animated counter
function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// Section wrapper with fade-up animation
function Section({ id, children, alt = false, className = "" }: { id: string; children: React.ReactNode; alt?: boolean; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <section
      id={id}
      ref={ref}
      className={`py-16 md:py-20 transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${alt ? "bg-[oklch(0.97_0.01_240)]" : "bg-white"} ${className}`}
    >
      {children}
    </section>
  );
}

// Card component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl p-6 shadow-[0_8px_32px_rgba(7,22,45,0.07)] card-hover ${className}`}>
      {children}
    </div>
  );
}

// KPI Card
function KpiCard({ value, label, prefix = "", suffix = "", icon }: { value: number; label: string; prefix?: string; suffix?: string; icon: string }) {
  return (
    <Card className="text-left">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-display text-3xl font-bold text-[oklch(0.17_0.05_248)] mb-1">
        <AnimatedCounter target={value} prefix={prefix} suffix={suffix} />
      </div>
      <div className="text-sm text-[oklch(0.52_0.04_250)] font-medium">{label}</div>
    </Card>
  );
}

// Section header
function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="relative mb-10">
      <div className="section-number">{number}</div>
      <div className="relative z-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.45_0.18_258)] mb-2 font-display">
          Section {number}
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[oklch(0.13_0.04_250)] mb-3 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[oklch(0.52_0.04_250)] text-lg max-w-3xl leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Nav sections
const NAV_SECTIONS = [
  { id: "executive-summary", label: "Executive Summary" },
  { id: "company-overview", label: "Company Overview" },
  { id: "mission-vision", label: "Mission & Vision" },
  { id: "market-opportunity", label: "Market Opportunity" },
  { id: "services", label: "Services" },
  { id: "target-customers", label: "Customers" },
  { id: "competitive-advantage", label: "Advantage" },
  { id: "operations", label: "Operations" },
  { id: "technology", label: "Technology" },
  { id: "marketing", label: "Marketing" },
  { id: "revenue-model", label: "Revenue" },
  { id: "financial-plan", label: "Financials" },
  { id: "growth-plan", label: "12-Month Plan" },
  { id: "funding", label: "Funding" },
  { id: "why-win", label: "Why We Win" },
  { id: "contact", label: "Contact" },
];

export default function BusinessPlan() {
  const [activeSection, setActiveSection] = useState("executive-summary");
  const [navVisible, setNavVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const sessionId = useRef(getSessionId());
  const trackEvent = trpc.analytics.trackEvent.useMutation();
  const trackedSections = useRef<Set<string>>(new Set());

  // Track page view on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { trackEvent.mutate({ eventType: "page_view", sessionId: sessionId.current }); }, []);

  // Track section views when they become active
  useEffect(() => {
    if (activeSection && !trackedSections.current.has(activeSection)) {
      trackedSections.current.add(activeSection);
      trackEvent.mutate({ eventType: "section_view", sectionId: activeSection, sessionId: sessionId.current });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const handlePdfDownload = useCallback(() => {
    trackEvent.mutate({ eventType: "pdf_download", sessionId: sessionId.current });
    window.print();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContactClick = useCallback(() => {
    trackEvent.mutate({ eventType: "contact_click", sessionId: sessionId.current });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setNavVisible(window.scrollY > 80);
      const sections = NAV_SECTIONS.map(s => document.getElementById(s.id));
      const scrollY = window.scrollY + 120;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(NAV_SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.005_240)]">

      {/* ── STICKY NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 no-print ${
          navVisible
            ? "bg-[oklch(0.13_0.04_250)/0.97] backdrop-blur-md shadow-[0_2px_20px_rgba(7,22,45,0.25)]"
            : "bg-transparent pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 text-[oklch(0.75_0.05_240)] hover:text-white text-xs font-semibold transition-colors no-print"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Dashboard
            </button>
            <span className="text-white/20 no-print">|</span>
            <span className="font-display font-bold text-white text-sm tracking-wide whitespace-nowrap">Business Plan</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {NAV_SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                  activeSection === s.id
                    ? "bg-[oklch(0.45_0.18_258)] text-white"
                    : "text-[oklch(0.8_0.02_240)] hover:text-white hover:bg-white/10"
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
          {/* Mobile menu button */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {mobileMenuOpen
                ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              }
            </svg>
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[oklch(0.13_0.04_250)] border-t border-white/10 px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeSection === s.id
                    ? "bg-[oklch(0.45_0.18_258)] text-white"
                    : "text-[oklch(0.8_0.02_240)] hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <header
        className="relative min-h-[92vh] flex items-center overflow-hidden hero-section"
        style={{
          background: `linear-gradient(135deg, rgba(7,22,45,0.97) 0%, rgba(11,31,58,0.93) 55%, rgba(18,61,122,0.88) 100%), url(${HERO_BG}) center/cover no-repeat`,
        }}
      >
        {/* Diagonal clip */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-[oklch(0.99_0.005_240)]"
          style={{ clipPath: "polygon(0 60%, 100% 0, 100% 100%, 0 100%)" }}
        />

        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
            {/* Left: Main content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.14_240)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.85_0.05_240)]">
                  WV Transport &amp; Logistics, LLC · Business Plan 2026
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
                Professional Logistics<br />
                <span className="text-[oklch(0.68_0.14_240)]">Built for Reliable</span><br />
                Freight Operations
              </h1>

              <p className="text-[oklch(0.85_0.03_240)] text-lg leading-relaxed max-w-2xl mb-8">
                WV Transport &amp; Logistics, LLC is a Pennsylvania-based transportation and logistics company focused on cargo van freight, brokered load support, delivery coordination, proof of delivery, and internal operational control through its proprietary platform, <strong className="text-white">WV Control Center</strong>.
              </p>

              <div className="flex flex-wrap gap-3 mb-10 no-print">
                <button
                  onClick={handlePdfDownload}
                  className="inline-flex items-center gap-2 bg-[oklch(0.45_0.18_258)] hover:bg-[oklch(0.50_0.20_258)] text-white font-bold px-6 py-3.5 rounded-full transition-all shadow-[0_8px_24px_rgba(29,78,216,0.35)] hover:shadow-[0_12px_32px_rgba(29,78,216,0.45)] hover:scale-105"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </button>
                <a
                  href="#contact"
                  onClick={handleContactClick}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-6 py-3.5 rounded-full transition-all backdrop-blur-sm hover:scale-105"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.87 2 2 0 0 1 3.58 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z"/>
                  </svg>
                  Contact Us
                </a>
              </div>

              {/* Executive positioning card */}
              <div className="bg-white/8 border border-white/15 rounded-2xl p-5 backdrop-blur-sm max-w-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[oklch(0.45_0.18_258)]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.68 0.14 240)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-display font-bold text-white text-sm mb-1">Executive Positioning</div>
                    <p className="text-[oklch(0.82_0.03_240)] text-sm leading-relaxed">
                      Designed to combine lean transportation operations with structured internal systems, professional communication, and verified delivery execution — creating a scalable, bank-ready foundation that distinguishes WV Transport from informal early-stage operators.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Stats panel */}
            <div className="bg-white/8 border border-white/15 rounded-3xl p-6 backdrop-blur-sm">
              <div className="font-display font-bold text-white text-sm mb-4 uppercase tracking-wider">
                Company at a Glance
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Freight Focus", value: "Local + Regional", icon: "🗺️" },
                  { label: "Operational Visibility", value: "Real-Time", icon: "📡" },
                  { label: "Operating Model", value: "Cargo Van", icon: "🚐" },
                  { label: "Internal Platform", value: "WV Control Center", icon: "💻" },
                  { label: "State of Incorporation", value: "Pennsylvania", icon: "🏛️" },
                  { label: "Business Type", value: "LLC", icon: "📋" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/8 rounded-xl p-3.5 border border-white/10">
                    <div className="text-lg mb-1">{item.icon}</div>
                    <div className="font-display font-bold text-white text-sm leading-tight">{item.value}</div>
                    <div className="text-[oklch(0.7_0.04_240)] text-xs mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/15 pt-4">
                <div className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">
                  12-Month Revenue Target
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="font-display font-bold text-3xl text-[oklch(0.68_0.14_240)]">$120K–$180K</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-[oklch(0.45_0.18_258)] to-[oklch(0.68_0.14_240)] h-2 rounded-full w-[35%] transition-all duration-1000" />
                </div>
                <div className="text-[oklch(0.7_0.04_240)] text-xs mt-1.5">Foundation phase in progress</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 1. EXECUTIVE SUMMARY ── */}
      <Section id="executive-summary">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="01"
            title="Executive Summary"
            subtitle="A concise overview of WV Transport & Logistics, LLC and its strategic positioning in the Pennsylvania freight market."
          />
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
            <div className="space-y-5">
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed text-base">
                WV Transport &amp; Logistics, LLC is a Pennsylvania-based logistics and transportation company focused on cargo van freight, brokered load support, delivery coordination, and internal operational control. The company is being built to serve brokers, dispatchers, and commercial clients who need reliable, professional, and accountable freight execution.
              </p>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed text-base">
                Unlike many early-stage carriers that operate informally, WV Transport is building its infrastructure from the ground up — with professional branding, documented workflows, a developing internal management platform called <strong className="text-[oklch(0.17_0.05_248)] font-semibold">WV Control Center</strong>, and a clear operational philosophy centered on reliability, communication, and verified delivery execution.
              </p>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed text-base">
                The company is structured as a Limited Liability Company (LLC) and is positioned to grow from a lean single-van operation into a multi-vehicle logistics business with direct commercial client relationships and a scalable internal technology foundation.
              </p>
              <div className="callout-blue mt-6">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed italic">
                  <strong className="text-[oklch(0.17_0.05_248)] not-italic">Investment Thesis:</strong> WV Transport &amp; Logistics presents a disciplined, systems-oriented approach to freight operations — combining the agility of a small carrier with the operational standards of a mid-market logistics company. The business is designed to be bank-ready, broker-ready, and scalable from day one.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-lg mb-4">Key Highlights</h3>
                <div className="space-y-3">
                  {[
                    { label: "Business Entity", value: "LLC — Pennsylvania" },
                    { label: "Service Focus", value: "Cargo Van Freight & Brokered Loads" },
                    { label: "Target Market", value: "Brokers, Dispatchers, Commercial Clients" },
                    { label: "Technology Edge", value: "WV Control Center Platform" },
                    { label: "Delivery Standard", value: "100% POD Compliance Target" },
                    { label: "Growth Model", value: "Lean → Scalable → Multi-Vehicle" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-3 py-2 border-b border-[oklch(0.91_0.01_240)] last:border-0">
                      <span className="text-sm text-[oklch(0.52_0.04_250)] font-medium">{item.label}</span>
                      <span className="text-sm font-semibold text-[oklch(0.17_0.05_248)] text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard value={95} suffix="%" label="On-Time Delivery Target" icon="✅" />
                <KpiCard value={100} suffix="%" label="POD Compliance Goal" icon="📸" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 2. COMPANY OVERVIEW ── */}
      <Section id="company-overview" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="02"
            title="Company Overview"
            subtitle="Foundational details about WV Transport & Logistics, LLC — its structure, location, and operational scope."
          />
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: "🏢",
                title: "Legal Structure",
                body: "WV Transport & Logistics, LLC is a formally registered Limited Liability Company in the Commonwealth of Pennsylvania, providing full legal protection and a professional business foundation for all operations and financial relationships.",
              },
              {
                icon: "📍",
                title: "Location & Service Area",
                body: "Headquartered at 502 W 7th St, Suite 100, Erie, PA 16502. The company services local and regional freight corridors throughout Pennsylvania and neighboring states, with the flexibility to expand coverage as capacity grows.",
              },
              {
                icon: "🚐",
                title: "Core Operations",
                body: "Operations are centered on cargo van freight — a nimble, cost-efficient segment of the logistics market. The company handles brokered loads, direct delivery coordination, proof-of-delivery documentation, and real-time operational visibility.",
              },
            ].map(card => (
              <Card key={card.title}>
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-lg mb-3">{card.title}</h3>
                <p className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{card.body}</p>
              </Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-center">
            <div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-4">Company Details</h3>
              <table className="data-table border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden w-full">
                <tbody>
                  {[
                    ["Company Name", "WV Transport & Logistics, LLC"],
                    ["Entity Type", "Limited Liability Company (LLC)"],
                    ["State", "Pennsylvania, USA"],
                    ["Address", "502 W 7th St, Suite 100, Erie, PA 16502"],
                    ["Phone", "(267) 390-3204"],
                    ["Email", "info@wvtransports.com"],
                    ["Website", "wvtransports.com"],
                    ["Industry", "Transportation & Logistics (NAICS 484)"],
                    ["Primary Service", "Cargo Van Freight & Brokered Loads"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="font-semibold text-[oklch(0.35_0.03_250)] text-sm bg-[oklch(0.97_0.01_240)] w-44">{k}</td>
                      <td className="text-[oklch(0.17_0.05_248)] text-sm font-medium">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(7,22,45,0.12)]">
              <img
                src={FLEET_IMG}
                alt="WV Transport cargo van fleet"
                className="w-full h-64 object-cover"
              />
              <div className="bg-[oklch(0.17_0.05_248)] px-5 py-3">
                <p className="text-[oklch(0.82_0.03_240)] text-xs font-medium">
                  Professional cargo van fleet — the operational backbone of WV Transport &amp; Logistics
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 3. MISSION & VISION ── */}
      <Section id="mission-vision">
        <div className="container mx-auto px-4">
          <SectionHeader number="03" title="Mission &amp; Vision" />
          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            <div
              className="rounded-3xl p-8 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 250) 0%, oklch(0.28 0.09 250) 100%)" }}
            >
              <div className="absolute top-4 right-4 text-6xl opacity-10 font-display font-black">M</div>
              <div className="text-[oklch(0.68_0.14_240)] text-xs font-bold uppercase tracking-[0.2em] mb-3 font-display">Mission Statement</div>
              <h3 className="font-display font-bold text-2xl text-white mb-4 leading-tight">
                Deliver Freight with Precision, Professionalism, and Accountability
              </h3>
              <p className="text-[oklch(0.82_0.03_240)] leading-relaxed text-sm">
                To provide reliable, professional, and technology-supported freight transportation services to brokers, dispatchers, and commercial clients — building long-term relationships through consistent execution, transparent communication, and verified delivery documentation.
              </p>
            </div>
            <div
              className="rounded-3xl p-8 text-white relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, oklch(0.28 0.09 250) 0%, oklch(0.45 0.18 258) 100%)" }}
            >
              <div className="absolute top-4 right-4 text-6xl opacity-10 font-display font-black">V</div>
              <div className="text-[oklch(0.85_0.05_240)] text-xs font-bold uppercase tracking-[0.2em] mb-3 font-display">Vision Statement</div>
              <h3 className="font-display font-bold text-2xl text-white mb-4 leading-tight">
                Become a Trusted Regional Logistics Partner
              </h3>
              <p className="text-[oklch(0.9_0.02_240)] leading-relaxed text-sm">
                To become a recognized and trusted logistics company in the Pennsylvania region and beyond — known for operational discipline, professional standards, and the ability to scale freight operations through structured systems and strong client relationships.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: "🎯", value: "Reliability", desc: "Consistent on-time delivery performance" },
              { icon: "🤝", value: "Accountability", desc: "Full documentation and transparent communication" },
              { icon: "⚙️", value: "Efficiency", desc: "Lean operations with maximum route optimization" },
              { icon: "📈", value: "Growth", desc: "Scalable systems built for long-term expansion" },
            ].map(v => (
              <Card key={v.value} className="text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-1">{v.value}</div>
                <p className="text-[oklch(0.52_0.04_250)] text-xs leading-relaxed">{v.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 4. MARKET OPPORTUNITY ── */}
      <Section id="market-opportunity" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="04"
            title="Market Opportunity"
            subtitle="The U.S. freight and logistics industry presents significant and growing opportunities for lean, technology-enabled cargo van operators."
          />
          <div className="grid lg:grid-cols-4 gap-5 mb-10">
            <KpiCard value={900} prefix="$" suffix="B+" label="U.S. Trucking Industry Revenue" icon="🇺🇸" />
            <KpiCard value={12} suffix="%" label="Last-Mile Delivery Annual Growth" icon="📦" />
            <KpiCard value={3} suffix="M+" label="Active Freight Brokers in the U.S." icon="🤝" />
            <KpiCard value={40} suffix="%" label="Cargo Van Share of Last-Mile Loads" icon="🚐" />
          </div>
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
            <div className="space-y-5">
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed">
                The U.S. trucking and freight industry generates over <strong className="text-[oklch(0.17_0.05_248)]">$900 billion in annual revenue</strong>, with the last-mile and regional delivery segment growing at an accelerating pace driven by e-commerce expansion, supply chain restructuring, and increasing demand for flexible, time-sensitive freight solutions.
              </p>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed">
                Cargo van freight occupies a particularly attractive niche: lower operating costs than full-size trucks, access to urban and suburban delivery zones, faster load turnaround, and strong demand from brokers seeking reliable small-load capacity. This segment is underserved by large carriers and represents a natural entry point for disciplined, professional operators.
              </p>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed">
                Pennsylvania's strategic location — at the intersection of major I-78, I-80, and I-76 freight corridors — provides WV Transport with direct access to high-volume freight lanes connecting the Northeast, Mid-Atlantic, and Midwest markets.
              </p>
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Market Drivers</h3>
                <div className="space-y-3">
                  {[
                    { icon: "📦", label: "E-commerce growth driving last-mile demand" },
                    { icon: "🔗", label: "Supply chain diversification increasing broker activity" },
                    { icon: "⏱️", label: "Same-day and next-day delivery expectations" },
                    { icon: "🏭", label: "Regional manufacturing and distribution expansion" },
                    { icon: "📱", label: "Technology enabling real-time freight matching" },
                    { icon: "🚫", label: "Driver shortage creating capacity gaps for reliable operators" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <span className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="callout-blue">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed">
                  <strong className="text-[oklch(0.17_0.05_248)]">Strategic Positioning:</strong> WV Transport is entering the market at a time when brokers actively seek reliable, professional small-load carriers — and when operational discipline and technology adoption are becoming key differentiators.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 5. SERVICES OFFERED ── */}
      <Section id="services">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="05"
            title="Services Offered"
            subtitle="A comprehensive suite of freight and logistics services designed to meet the needs of brokers, dispatchers, and commercial clients."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "🚐",
                title: "Cargo Van Freight",
                desc: "Primary service offering. Local and regional cargo van loads sourced through broker networks and direct client relationships. Capacity for standard freight, time-sensitive loads, and high-frequency delivery routes.",
                tag: "Core Service",
              },
              {
                icon: "📋",
                title: "Brokered Load Support",
                desc: "Professional coordination with freight brokers including load acceptance, documentation handling, rate negotiation support, and consistent communication throughout the load lifecycle.",
                tag: "Core Service",
              },
              {
                icon: "📍",
                title: "Delivery Coordination",
                desc: "End-to-end delivery management from load assignment through final delivery confirmation. Real-time status updates, proactive communication, and structured follow-through on every shipment.",
                tag: "Core Service",
              },
              {
                icon: "📸",
                title: "Proof of Delivery (POD)",
                desc: "Comprehensive delivery documentation including timestamped photos, delivery notes, and future signature capture. All POD records are stored in the WV Control Center for client and broker access.",
                tag: "Compliance",
              },
              {
                icon: "🔄",
                title: "Scheduled & Recurring Freight",
                desc: "Dedicated support for clients requiring consistent, recurring delivery schedules. Reliable capacity commitment, predictable service standards, and priority routing for repeat business relationships.",
                tag: "Growth Service",
              },
              {
                icon: "💼",
                title: "Direct Commercial Delivery",
                desc: "As the business matures, WV Transport will pursue direct commercial client relationships for local and regional delivery support — reducing broker dependency and improving margin structure.",
                tag: "Growth Service",
              },
            ].map(service => (
              <Card key={service.title}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{service.icon}</div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    service.tag === "Core Service"
                      ? "bg-[oklch(0.94_0.03_248)] text-[oklch(0.28_0.09_250)]"
                      : service.tag === "Compliance"
                      ? "bg-[oklch(0.95_0.04_145)] text-[oklch(0.35_0.12_145)]"
                      : "bg-[oklch(0.95_0.04_60)] text-[oklch(0.45_0.12_60)]"
                  }`}>
                    {service.tag}
                  </span>
                </div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-2">{service.title}</h3>
                <p className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{service.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 6. TARGET CUSTOMERS ── */}
      <Section id="target-customers" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="06"
            title="Target Customers"
            subtitle="WV Transport serves a focused set of client segments where professional execution and reliable communication create lasting value."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: "🏢",
                title: "Freight Brokers",
                desc: "The primary revenue source in the startup phase. Brokers need reliable carriers with professional communication, consistent availability, and documented delivery execution. WV Transport is positioned to become a preferred carrier for select broker partners.",
              },
              {
                icon: "📡",
                title: "Dispatchers & Dispatch Services",
                desc: "Third-party dispatch services that manage load sourcing and carrier coordination. WV Transport's operational discipline and internal systems make it an attractive partner for dispatch services seeking accountable, professional operators.",
              },
              {
                icon: "🏭",
                title: "Commercial Businesses",
                desc: "Small to mid-size businesses requiring regular local or regional delivery support. Retail distributors, manufacturers, and service companies that need reliable, verified freight execution with professional documentation.",
              },
              {
                icon: "🏪",
                title: "E-commerce & Retail",
                desc: "Online retailers and brick-and-mortar businesses with recurring last-mile delivery needs. This segment values speed, reliability, and proof-of-delivery documentation — all core competencies of WV Transport.",
              },
            ].map(c => (
              <Card key={c.title}>
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-2">{c.title}</h3>
                <p className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{c.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 7. COMPETITIVE ADVANTAGE ── */}
      <Section id="competitive-advantage">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="07"
            title="Competitive Advantage"
            subtitle="WV Transport differentiates through operational discipline, professional standards, and proprietary internal technology — not just vehicle count."
          />
          <div className="grid lg:grid-cols-[1fr_1fr] gap-8 mb-8">
            <div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-5">Operational Differentiators</h3>
              <div className="space-y-3">
                {[
                  { icon: "🏗️", title: "Systems-First Approach", desc: "Internal workflows, documentation standards, and operational protocols are established from day one — not retrofitted after growth." },
                  { icon: "📞", title: "Professional Communication", desc: "Consistent, timely, and professional communication with brokers and clients. Response standards and follow-through protocols are built into operations." },
                  { icon: "📸", title: "Verified Delivery Documentation", desc: "Every delivery is documented with photos, timestamps, and notes. POD records are stored and accessible, reducing disputes and building trust." },
                  { icon: "🚐", title: "Lean Cargo Van Model", desc: "Lower operating costs, higher flexibility, and access to freight segments that larger carriers cannot efficiently serve." },
                  { icon: "🔁", title: "Relationship-Focused Growth", desc: "Prioritizing repeat broker and client relationships over one-off transactions — building a stable, predictable revenue base." },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-[oklch(0.97_0.01_240)] border border-[oklch(0.91_0.01_240)]">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-sm mb-1">{item.title}</div>
                      <p className="text-[oklch(0.35_0.03_250)] text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-5">Competitive Positioning Matrix</h3>
              <div className="bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(7,22,45,0.07)] mb-5">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th className="text-center">WV Transport</th>
                      <th className="text-center">Typical Startup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Internal Management Platform", "✅", "❌"],
                      ["Proof of Delivery Documentation", "✅", "⚠️"],
                      ["Professional Branding", "✅", "⚠️"],
                      ["Structured Operational Workflows", "✅", "❌"],
                      ["Bank-Ready Financial Records", "✅", "❌"],
                      ["Broker Communication Standards", "✅", "⚠️"],
                      ["Scalable Systems Architecture", "✅", "❌"],
                    ].map(([cap, wv, comp]) => (
                      <tr key={cap as string}>
                        <td className="text-sm text-[oklch(0.25_0.03_250)]">{cap}</td>
                        <td className="text-center text-base">{wv}</td>
                        <td className="text-center text-base">{comp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="callout-blue">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed">
                  <strong className="text-[oklch(0.17_0.05_248)]">Key Insight:</strong> Most early-stage transportation companies operate without formal systems, documentation standards, or professional infrastructure. WV Transport's structured approach creates a measurable competitive advantage in broker relationships and long-term client retention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 8. OPERATIONS PLAN ── */}
      <Section id="operations" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="08"
            title="Operations Plan"
            subtitle="A structured six-stage workflow designed for efficiency, visibility, and complete operational control from load sourcing to administrative close-out."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {[
              { step: "01", icon: "🔍", title: "Load Sourcing", desc: "Loads are sourced through established broker networks, load boards, and direct client relationships. Each load is evaluated for profitability, route efficiency, and operational fit before acceptance." },
              { step: "02", icon: "💾", title: "Internal Entry & Logging", desc: "All accepted load details are entered into WV Control Center — the company's internal management platform — for tracking, documentation, and operational control." },
              { step: "03", icon: "👤", title: "Driver Assignment", desc: "The driver receives a complete load package including pickup/delivery details, contact information, special instructions, and all relevant documentation." },
              { step: "04", icon: "📡", title: "Real-Time Status Updates", desc: "Driver updates load status through the workflow: Assigned → Picked Up → In Transit → Delivered. All status changes are timestamped and logged in the system." },
              { step: "05", icon: "📸", title: "Proof of Delivery", desc: "Upon delivery, the driver captures photographic evidence, delivery notes, and timestamps. Future capability includes digital signature capture. All POD records are stored and accessible." },
              { step: "06", icon: "📊", title: "Administrative Close-Out", desc: "Post-delivery administrative tasks including document submission, invoice processing, financial recording, and performance review are completed to close the load cycle." },
            ].map(op => (
              <Card key={op.step}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[oklch(0.45_0.18_258)] flex items-center justify-center flex-shrink-0">
                    <span className="font-mono-data font-bold text-white text-xs">{op.step}</span>
                  </div>
                  <span className="text-xl">{op.icon}</span>
                </div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-2">{op.title}</h3>
                <p className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{op.desc}</p>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="bg-[oklch(0.97_0.02_240)]">
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-3">Daily Operations</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.35_0.03_250)]">
                <li className="flex items-start gap-2"><span className="text-[oklch(0.45_0.18_258)] font-bold">→</span> Morning load review and route planning</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.45_0.18_258)] font-bold">→</span> Vehicle inspection and readiness check</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.45_0.18_258)] font-bold">→</span> Broker communication and load confirmation</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.45_0.18_258)] font-bold">→</span> Real-time status updates throughout the day</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.45_0.18_258)] font-bold">→</span> End-of-day administrative reconciliation</li>
              </ul>
            </Card>
            <Card className="bg-[oklch(0.97_0.02_240)]">
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-3">Compliance Standards</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.35_0.03_250)]">
                <li className="flex items-start gap-2"><span className="text-[oklch(0.52_0.14_145)] font-bold">✓</span> Commercial auto insurance maintained</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.52_0.14_145)] font-bold">✓</span> DOT/FMCSA compliance where applicable</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.52_0.14_145)] font-bold">✓</span> Vehicle maintenance log and inspection records</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.52_0.14_145)] font-bold">✓</span> Driver qualification file maintenance</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.52_0.14_145)] font-bold">✓</span> Load documentation retention policy</li>
              </ul>
            </Card>
            <Card className="bg-[oklch(0.97_0.02_240)]">
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-3">Quality Control</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.35_0.03_250)]">
                <li className="flex items-start gap-2"><span className="text-[oklch(0.72_0.15_60)] font-bold">★</span> 100% POD documentation requirement</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.72_0.15_60)] font-bold">★</span> On-time delivery tracking and reporting</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.72_0.15_60)] font-bold">★</span> Broker satisfaction monitoring</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.72_0.15_60)] font-bold">★</span> Incident and exception reporting protocol</li>
                <li className="flex items-start gap-2"><span className="text-[oklch(0.72_0.15_60)] font-bold">★</span> Monthly performance review process</li>
              </ul>
            </Card>
          </div>
        </div>
      </Section>

      {/* ── 9. TECHNOLOGY ── */}
      <Section id="technology">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="09"
            title="Technology &amp; Internal Systems"
            subtitle="WV Control Center — the proprietary internal management platform that gives WV Transport a structural advantage over informal competitors."
          />
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-[oklch(0.94_0.03_248)] border border-[oklch(0.45_0.18_258)]/30 rounded-full px-4 py-1.5 mb-5">
                <div className="w-2 h-2 rounded-full bg-[oklch(0.45_0.18_258)]" />
                <span className="font-display font-bold text-[oklch(0.28_0.09_250)] text-xs uppercase tracking-wider">Proprietary Platform</span>
              </div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-2xl mb-4">WV Control Center</h3>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed mb-4">
                WV Control Center is the company's internal operations management platform — a proprietary system designed to provide real-time visibility, structured workflow management, and comprehensive documentation for every freight movement.
              </p>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed mb-6">
                Rather than replacing broker-provided apps, WV Control Center functions as the company's internal source of truth — capturing operational data, storing delivery evidence, and providing management-level oversight that most small carriers simply do not have.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: "📊", title: "Load Tracking", desc: "Full lifecycle from assignment to delivery" },
                  { icon: "📸", title: "POD Records", desc: "Photo, timestamp, and note storage" },
                  { icon: "👁️", title: "Admin Visibility", desc: "Real-time operations oversight" },
                  { icon: "💬", title: "Driver Coordination", desc: "Communication and workflow tools" },
                  { icon: "📈", title: "Performance KPIs", desc: "Delivery rates and operational metrics" },
                  { icon: "💰", title: "Financial Tracking", desc: "Revenue, cost, and margin monitoring" },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-[oklch(0.97_0.01_240)] border border-[oklch(0.91_0.01_240)]">
                    <span className="text-lg flex-shrink-0">{f.icon}</span>
                    <div>
                      <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xs mb-0.5">{f.title}</div>
                      <div className="text-[oklch(0.52_0.04_250)] text-xs">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="callout-blue">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed">
                  <strong className="text-[oklch(0.17_0.05_248)]">Strategic Value:</strong> WV Control Center transforms operational data into a competitive asset — enabling better decision-making, stronger broker relationships, and a scalable foundation for growth that informal operators cannot replicate.
                </p>
              </div>
            </div>
            <div>
              <div className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(7,22,45,0.15)] border border-[oklch(0.91_0.01_240)]">
                <img
                  src={CONTROL_CENTER_IMG}
                  alt="WV Control Center dashboard interface"
                  className="w-full object-cover"
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Load Status", value: "Real-Time" },
                  { label: "POD Storage", value: "Cloud-Based" },
                  { label: "Access", value: "Web + Mobile" },
                ].map(item => (
                  <div key={item.label} className="bg-[oklch(0.94_0.03_248)] rounded-xl p-3 text-center">
                    <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-sm">{item.value}</div>
                    <div className="text-[oklch(0.52_0.04_250)] text-xs mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 10. MARKETING ── */}
      <Section id="marketing" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="10"
            title="Marketing &amp; Sales Strategy"
            subtitle="A focused, relationship-driven approach to building broker partnerships and establishing WV Transport as a trusted regional carrier."
          />
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: "🤝",
                title: "Broker Relationship Development",
                items: [
                  "Identify and approach 5–10 target brokers in the first 90 days",
                  "Present professional carrier packet with company overview and capabilities",
                  "Demonstrate operational readiness through consistent execution",
                  "Build preferred carrier status through reliability and communication",
                  "Leverage WV Control Center data to demonstrate performance metrics",
                ],
              },
              {
                icon: "🌐",
                title: "Digital Presence & Branding",
                items: [
                  "Professional website at wvtransports.com",
                  "Business email and professional communication standards",
                  "LinkedIn company profile for B2B visibility",
                  "Google Business Profile for local search presence",
                  "Consistent brand identity across all touchpoints",
                ],
              },
              {
                icon: "📈",
                title: "Growth & Retention Strategy",
                items: [
                  "Prioritize repeat business over one-off transactions",
                  "Track and report delivery performance to key broker partners",
                  "Develop direct commercial client relationships over time",
                  "Use operational data to demonstrate value and negotiate better rates",
                  "Expand service offerings as capacity and systems mature",
                ],
              },
            ].map(strategy => (
              <Card key={strategy.title}>
                <div className="text-3xl mb-3">{strategy.icon}</div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-3">{strategy.title}</h3>
                <ul className="space-y-2">
                  {strategy.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[oklch(0.35_0.03_250)]">
                      <span className="text-[oklch(0.45_0.18_258)] font-bold flex-shrink-0 mt-0.5">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Brand Positioning Statement</h3>
              <div
                className="rounded-xl p-5 text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 250), oklch(0.28 0.09 250))" }}
              >
                <p className="text-[oklch(0.85_0.03_240)] text-sm leading-relaxed italic">
                  "WV Transport &amp; Logistics is the professional, systems-driven cargo van carrier that brokers and commercial clients can rely on for consistent execution, transparent communication, and verified delivery documentation — every time."
                </p>
              </div>
            </Card>
            <Card>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Marketing Channels</h3>
              <div className="space-y-2">
                {[
                  { channel: "Load Boards (DAT, Truckstop)", priority: "High", type: "Primary" },
                  { channel: "Direct Broker Outreach", priority: "High", type: "Primary" },
                  { channel: "Professional Website", priority: "High", type: "Foundation" },
                  { channel: "LinkedIn B2B Network", priority: "Medium", type: "Growth" },
                  { channel: "Referral & Word of Mouth", priority: "High", type: "Long-term" },
                  { channel: "Google Business Profile", priority: "Medium", type: "Local" },
                ].map(ch => (
                  <div key={ch.channel} className="flex items-center justify-between py-2 border-b border-[oklch(0.91_0.01_240)] last:border-0">
                    <span className="text-sm text-[oklch(0.25_0.03_250)]">{ch.channel}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ch.priority === "High"
                          ? "bg-[oklch(0.95_0.04_145)] text-[oklch(0.35_0.12_145)]"
                          : "bg-[oklch(0.95_0.04_60)] text-[oklch(0.45_0.12_60)]"
                      }`}>{ch.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>

      {/* ── 11. REVENUE MODEL ── */}
      <Section id="revenue-model">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="11"
            title="Revenue Model"
            subtitle="A transaction-based model in the startup phase, evolving toward relationship-based recurring revenue as the business matures."
          />
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
            <div>
              <div className="space-y-4 mb-6">
                {[
                  {
                    phase: "Phase 1 — Startup (Months 1–4)",
                    color: "oklch(0.45 0.18 258)",
                    sources: [
                      "Brokered cargo van loads (primary)",
                      "Load board freight sourcing",
                      "Per-load transaction revenue",
                    ],
                    model: "Transaction-based",
                  },
                  {
                    phase: "Phase 2 — Growth (Months 5–9)",
                    color: "oklch(0.35 0.12 255)",
                    sources: [
                      "Preferred broker relationships",
                      "Recurring scheduled freight",
                      "Improved rate negotiation",
                    ],
                    model: "Relationship-based",
                  },
                  {
                    phase: "Phase 3 — Scale (Months 10–12+)",
                    color: "oklch(0.28 0.09 250)",
                    sources: [
                      "Direct commercial client contracts",
                      "Multi-load broker agreements",
                      "Expanded capacity revenue",
                    ],
                    model: "Contract-based",
                  },
                ].map(phase => (
                  <div key={phase.phase} className="border border-[oklch(0.91_0.01_240)] rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-sm">{phase.phase}</h3>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[oklch(0.94_0.03_248)] text-[oklch(0.28_0.09_250)]">
                        {phase.model}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {phase.sources.map(s => (
                        <li key={s} className="flex items-center gap-2 text-sm text-[oklch(0.35_0.03_250)]">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phase.color }} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <Card>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Revenue Drivers</h3>
                <div className="space-y-3">
                  {[
                    { label: "Load Volume", desc: "Number of loads completed per month" },
                    { label: "Rate per Mile", desc: "Negotiated rate on loaded miles" },
                    { label: "Route Efficiency", desc: "Minimizing deadhead and empty miles" },
                    { label: "Broker Relationships", desc: "Preferred carrier status and rate access" },
                    { label: "Load Selection", desc: "Margin-sensitive load acceptance criteria" },
                  ].map(d => (
                    <div key={d.label} className="flex items-start gap-3 py-2 border-b border-[oklch(0.91_0.01_240)] last:border-0">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.45_0.18_258)] flex-shrink-0 mt-1.5" />
                      <div>
                        <div className="font-semibold text-[oklch(0.17_0.05_248)] text-sm">{d.label}</div>
                        <div className="text-[oklch(0.52_0.04_250)] text-xs">{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="callout-blue">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed">
                  <strong className="text-[oklch(0.17_0.05_248)]">Margin Strategy:</strong> WV Transport uses a structured load evaluation process that calculates estimated operating cost, profit margin, and rate per loaded mile before accepting any load — ensuring disciplined, margin-positive operations from the start.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 12. FINANCIAL PLAN ── */}
      <Section id="financial-plan" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="12"
            title="Financial Plan"
            subtitle="Planning-level financial projections for bank and operational planning purposes. All figures are estimates to be refined with real operating data."
          />
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Operating Estimate */}
            <div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-4">Monthly Operating Estimate</h3>
              <div className="bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(7,22,45,0.07)]">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Monthly Est.</th>
                      <th className="text-right">Annual Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: "Gross Revenue", mo: 8000, ann: 96000, type: "revenue" },
                      { cat: "Fuel", mo: -1200, ann: -14400, type: "expense" },
                      { cat: "Commercial Insurance", mo: -1000, ann: -12000, type: "expense" },
                      { cat: "Vehicle Maintenance & Repairs", mo: -400, ann: -4800, type: "expense" },
                      { cat: "Dispatch / Load Support", mo: -500, ann: -6000, type: "expense" },
                      { cat: "Software & Technology", mo: -150, ann: -1800, type: "expense" },
                      { cat: "Phone / Internet / Admin", mo: -150, ann: -1800, type: "expense" },
                      { cat: "Miscellaneous Operating", mo: -300, ann: -3600, type: "expense" },
                    ].map(row => (
                      <tr key={row.cat}>
                        <td className="text-sm text-[oklch(0.25_0.03_250)]">{row.cat}</td>
                        <td className={`text-right font-mono-data text-sm font-semibold ${row.type === "revenue" ? "text-[oklch(0.52_0.14_145)]" : "text-[oklch(0.25_0.03_250)]"}`}>
                          {row.type === "revenue" ? "+" : ""}{row.mo < 0 ? `(${Math.abs(row.mo).toLocaleString()})` : `$${row.mo.toLocaleString()}`}
                        </td>
                        <td className={`text-right font-mono-data text-sm font-semibold ${row.type === "revenue" ? "text-[oklch(0.52_0.14_145)]" : "text-[oklch(0.25_0.03_250)]"}`}>
                          {row.ann < 0 ? `($${Math.abs(row.ann).toLocaleString()})` : `$${row.ann.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="font-bold">Estimated Net Before Tax</td>
                      <td className="text-right font-mono-data font-bold text-[oklch(0.52_0.14_145)]">$4,300</td>
                      <td className="text-right font-mono-data font-bold text-[oklch(0.52_0.14_145)]">$51,600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[oklch(0.52_0.04_250)] text-xs mt-3 italic">
                * Estimates based on planning assumptions. Actual results will vary. To be updated with real operating data.
              </p>
            </div>

            {/* 12-Month Targets */}
            <div>
              <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-4">12-Month Performance Targets</h3>
              <div className="bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(7,22,45,0.07)] mb-5">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="text-right">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Monthly Revenue Goal", "$10,000 – $15,000"],
                      ["Annual Revenue Target", "$120,000 – $180,000"],
                      ["Monthly Active Loads", "20 – 35 loads"],
                      ["Active Broker Relationships", "5 – 10 brokers"],
                      ["On-Time Delivery Rate", "95%+"],
                      ["Proof of Delivery Compliance", "100%"],
                      ["Net Profit Margin (Year 1)", "40% – 55%"],
                      ["Break-Even Timeline", "Month 2 – 3"],
                    ].map(([metric, target]) => (
                      <tr key={metric as string}>
                        <td className="text-sm text-[oklch(0.25_0.03_250)]">{metric}</td>
                        <td className="text-right font-mono-data text-sm font-bold text-[oklch(0.17_0.05_248)]">{target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard value={15000} prefix="$" label="Monthly Revenue Goal" icon="💵" />
                <KpiCard value={55} suffix="%" label="Target Net Margin" icon="📊" />
              </div>
            </div>
          </div>

          {/* Quarterly Revenue Projection */}
          <div>
            <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-xl mb-4">Quarterly Revenue Projection — Year 1</h3>
            <div className="bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(7,22,45,0.07)]">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Quarter</th>
                    <th className="text-right">Revenue Est.</th>
                    <th className="text-right">Loads/Mo</th>
                    <th className="text-right">Net Est.</th>
                    <th>Phase Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { q: "Q1 (Months 1–3)", rev: "$18,000 – $24,000", loads: "8–15", net: "$7,200 – $11,000", phase: "Foundation & Setup" },
                    { q: "Q2 (Months 4–6)", rev: "$27,000 – $36,000", loads: "15–22", net: "$12,000 – $18,000", phase: "Operational Stability" },
                    { q: "Q3 (Months 7–9)", rev: "$33,000 – $45,000", loads: "22–30", net: "$15,000 – $22,000", phase: "Broker Expansion" },
                    { q: "Q4 (Months 10–12)", rev: "$42,000 – $57,000", loads: "28–35", net: "$18,000 – $28,000", phase: "Scale Preparation" },
                  ].map(row => (
                    <tr key={row.q}>
                      <td className="font-semibold text-[oklch(0.17_0.05_248)] text-sm">{row.q}</td>
                      <td className="text-right font-mono-data text-sm text-[oklch(0.52_0.14_145)] font-bold">{row.rev}</td>
                      <td className="text-right font-mono-data text-sm">{row.loads}</td>
                      <td className="text-right font-mono-data text-sm font-bold text-[oklch(0.28_0.09_250)]">{row.net}</td>
                      <td className="text-sm text-[oklch(0.52_0.04_250)]">{row.phase}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td className="font-bold">Year 1 Total</td>
                    <td className="text-right font-mono-data font-bold text-[oklch(0.52_0.14_145)]">$120K – $162K</td>
                    <td className="text-right font-mono-data font-bold">Avg 20–25</td>
                    <td className="text-right font-mono-data font-bold text-[oklch(0.52_0.14_145)]">$52K – $79K</td>
                    <td className="font-bold">Full Year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 13. 12-MONTH GROWTH PLAN ── */}
      <Section id="growth-plan">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="13"
            title="12-Month Growth Plan"
            subtitle="A structured three-phase roadmap for building operational stability, expanding broker relationships, and preparing for scalable growth."
          />
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                phase: "Phase 1",
                period: "Months 1–4",
                title: "Foundation",
                color: "oklch(0.45 0.18 258)",
                icon: "🏗️",
                milestones: [
                  "Open business banking account",
                  "Establish commercial auto insurance",
                  "Complete DOT/FMCSA compliance setup",
                  "Finalize website and professional branding",
                  "Complete WV Control Center improvements",
                  "Begin consistent freight activity",
                  "Establish first 2–3 broker relationships",
                  "Document initial delivery performance",
                ],
              },
              {
                phase: "Phase 2",
                period: "Months 5–8",
                title: "Operational Stability",
                color: "oklch(0.35 0.12 255)",
                icon: "⚙️",
                milestones: [
                  "Build 5–8 active broker relationships",
                  "Achieve 20+ loads per month consistently",
                  "Improve margins through load selection",
                  "Refine POD and tracking workflow",
                  "Establish recurring freight opportunities",
                  "Begin direct commercial client outreach",
                  "Implement monthly performance reporting",
                  "Build positive broker reputation and ratings",
                ],
              },
              {
                phase: "Phase 3",
                period: "Months 9–12",
                title: "Scale Preparation",
                color: "oklch(0.28 0.09 250)",
                icon: "🚀",
                milestones: [
                  "Reach 30–35 loads per month",
                  "Secure 1–2 direct commercial contracts",
                  "Improve internal reporting and analytics",
                  "Evaluate expansion capacity and readiness",
                  "Assess additional vehicle acquisition",
                  "Explore additional driver/contractor capacity",
                  "Prepare Year 2 growth plan and projections",
                  "Build bank relationship for credit access",
                ],
              },
            ].map(phase => (
              <Card key={phase.phase}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold text-xs"
                    style={{ background: phase.color }}
                  >
                    {phase.phase}
                  </div>
                  <div>
                    <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base">{phase.title}</div>
                    <div className="text-[oklch(0.52_0.04_250)] text-xs">{phase.period}</div>
                  </div>
                  <span className="ml-auto text-2xl">{phase.icon}</span>
                </div>
                <ul className="space-y-2">
                  {phase.milestones.map(m => (
                    <li key={m} className="flex items-start gap-2 text-sm text-[oklch(0.35_0.03_250)]">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: phase.color }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <KpiCard value={10} label="Target Broker Relationships" icon="🤝" />
            <KpiCard value={35} label="Monthly Loads (Month 12)" icon="📦" />
            <KpiCard value={180} prefix="$" suffix="K" label="Year 1 Revenue Target" icon="💰" />
            <KpiCard value={95} suffix="%" label="On-Time Delivery Goal" icon="⏱️" />
          </div>
        </div>
      </Section>

      {/* ── 14. FUNDING ── */}
      <Section id="funding" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="14"
            title="Funding &amp; Capital Needs"
            subtitle="A conservative, structured approach to capital deployment focused on operational reliability and sustainable growth."
          />
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
            <div>
              <p className="text-[oklch(0.25_0.03_250)] leading-relaxed mb-5">
                WV Transport &amp; Logistics is designed to operate with a lean capital structure, minimizing fixed overhead while maintaining the operational and compliance standards required to compete professionally in the freight market. Capital needs are focused on working capital, compliance, technology, and operational reserves.
              </p>
              <div className="bg-white border border-[oklch(0.91_0.01_240)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(7,22,45,0.07)] mb-5">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Capital Category</th>
                      <th className="text-right">Estimated Need</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: "Operating Reserve (3 months)", est: "$12,000 – $18,000", pri: "Critical" },
                      { cat: "Commercial Insurance (Annual)", est: "$10,000 – $14,000", pri: "Critical" },
                      { cat: "Vehicle Maintenance Reserve", est: "$3,000 – $5,000", pri: "High" },
                      { cat: "Technology & WV Control Center", est: "$2,000 – $4,000", pri: "High" },
                      { cat: "Business Development & Marketing", est: "$1,500 – $3,000", pri: "Medium" },
                      { cat: "Administrative & Compliance", est: "$1,000 – $2,000", pri: "High" },
                      { cat: "Fuel Advance / Working Capital", est: "$3,000 – $5,000", pri: "High" },
                    ].map(row => (
                      <tr key={row.cat}>
                        <td className="text-sm text-[oklch(0.25_0.03_250)]">{row.cat}</td>
                        <td className="text-right font-mono-data text-sm font-semibold text-[oklch(0.17_0.05_248)]">{row.est}</td>
                        <td>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            row.pri === "Critical"
                              ? "bg-[oklch(0.95_0.06_27)] text-[oklch(0.45_0.2_27)]"
                              : row.pri === "High"
                              ? "bg-[oklch(0.95_0.04_60)] text-[oklch(0.45_0.12_60)]"
                              : "bg-[oklch(0.94_0.03_248)] text-[oklch(0.28_0.09_250)]"
                          }`}>{row.pri}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="font-bold">Total Capital Need (Year 1)</td>
                      <td className="text-right font-mono-data font-bold text-[oklch(0.52_0.14_145)]">$32,500 – $51,000</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Funding Sources</h3>
                <div className="space-y-3">
                  {[
                    { source: "Owner Capital Contribution", desc: "Primary initial funding source", icon: "👤" },
                    { source: "Business Banking Relationship", desc: "Operating account and credit access", icon: "🏦" },
                    { source: "Small Business Credit Products", desc: "Business credit card and line of credit", icon: "💳" },
                    { source: "SBA Microloan Program", desc: "Up to $50,000 for qualifying small businesses", icon: "🏛️" },
                    { source: "Reinvested Operating Cash Flow", desc: "Revenue-funded growth after break-even", icon: "🔄" },
                  ].map(item => (
                    <div key={item.source} className="flex items-start gap-3 py-2 border-b border-[oklch(0.91_0.01_240)] last:border-0">
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="font-semibold text-[oklch(0.17_0.05_248)] text-sm">{item.source}</div>
                        <div className="text-[oklch(0.52_0.04_250)] text-xs">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="callout-blue">
                <p className="text-[oklch(0.25_0.03_250)] text-sm leading-relaxed">
                  <strong className="text-[oklch(0.17_0.05_248)]">Capital Philosophy:</strong> WV Transport intends to use capital conservatively, focusing on operational reliability and compliance rather than rapid expansion without structure. Growth will be funded primarily through operating cash flow after the initial setup phase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 15. WHY THIS BUSINESS WINS ── */}
      <Section id="why-win">
        <div className="container mx-auto px-4">
          <SectionHeader
            number="15"
            title="Why This Business Is Positioned to Succeed"
          />
          <div
            className="rounded-3xl p-8 md:p-10 text-white mb-8 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 250) 0%, oklch(0.28 0.09 250) 60%, oklch(0.45 0.18 258) 100%)" }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
              <svg viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2"/>
                <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="2"/>
                <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <div className="relative z-10 max-w-3xl">
              <div className="text-[oklch(0.68_0.14_240)] text-xs font-bold uppercase tracking-[0.2em] mb-3 font-display">Executive Assessment</div>
              <h3 className="font-display font-bold text-2xl md:text-3xl text-white mb-4 leading-tight">
                Operational Intention That Most Early-Stage Carriers Lack
              </h3>
              <p className="text-[oklch(0.85_0.03_240)] leading-relaxed text-base">
                WV Transport &amp; Logistics is being built with an unusual level of operational intention for an early-stage transportation company. Rather than relying on manual coordination and informal processes, the business is creating internal systems, professional branding, and documented workflows from the beginning — establishing a foundation that most competitors build only after years of operation, if at all.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🏗️", title: "Systems Built from Day One", desc: "Internal workflows, documentation standards, and operational protocols are established before scale — not retrofitted after problems arise." },
              { icon: "💻", title: "Proprietary Technology Advantage", desc: "WV Control Center provides operational visibility, load tracking, and POD documentation that most small carriers simply do not have." },
              { icon: "📞", title: "Professional Communication Standards", desc: "Consistent, timely, and professional communication with brokers and clients builds trust and preferred carrier relationships." },
              { icon: "📸", title: "100% Delivery Documentation", desc: "Every delivery is documented with photos, timestamps, and notes — reducing disputes, building trust, and demonstrating accountability." },
              { icon: "🏦", title: "Bank-Ready Financial Structure", desc: "Formal LLC structure, business banking, documented financials, and organized records position the company for credit and growth capital access." },
              { icon: "📈", title: "Scalable Foundation", desc: "The operational systems, technology platform, and professional standards in place today can support 2x, 5x, or 10x growth without rebuilding from scratch." },
            ].map(item => (
              <Card key={item.title}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-2">{item.title}</h3>
                <p className="text-[oklch(0.35_0.03_250)] text-sm leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 16. CONTACT ── */}
      <Section id="contact" alt>
        <div className="container mx-auto px-4">
          <SectionHeader
            number="16"
            title="Contact Information"
            subtitle="Reach out to discuss freight opportunities, broker partnerships, or business inquiries."
          />
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-display font-black text-lg"
                    style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 250), oklch(0.45 0.18 258))" }}
                  >
                    WV
                  </div>
                  <div>
                    <div className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base">WV Transport &amp; Logistics, LLC</div>
                    <div className="text-[oklch(0.52_0.04_250)] text-xs">Pennsylvania-Based Logistics Company</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: "📍", label: "Address", value: "502 W 7th St, Suite 100\nErie, PA 16502, USA" },
                    { icon: "📞", label: "Phone", value: "(267) 390-3204" },
                    { icon: "✉️", label: "Email", value: "info@wvtransports.com" },
                    { icon: "🌐", label: "Website", value: "wvtransports.com" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 py-2.5 border-b border-[oklch(0.91_0.01_240)] last:border-0">
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="text-[oklch(0.52_0.04_250)] text-xs font-medium uppercase tracking-wide">{item.label}</div>
                        <div className="font-semibold text-[oklch(0.17_0.05_248)] text-sm whitespace-pre-line">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="flex gap-3 no-print">
                <a
                  href="tel:+12673903204"
                  className="flex-1 flex items-center justify-center gap-2 bg-[oklch(0.45_0.18_258)] hover:bg-[oklch(0.50_0.20_258)] text-white font-bold py-3 rounded-xl transition-all text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.87 2 2 0 0 1 3.58 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5z"/>
                  </svg>
                  Call Now
                </a>
                <a
                  href="mailto:info@wvtransports.com"
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-[oklch(0.45_0.18_258)] text-[oklch(0.28_0.09_250)] hover:bg-[oklch(0.94_0.03_248)] font-bold py-3 rounded-xl transition-all text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Send Email
                </a>
              </div>
            </div>
            <div>
              <Card>
                <h3 className="font-display font-bold text-[oklch(0.17_0.05_248)] text-base mb-4">Business Inquiry Form</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">First Name</label>
                      <input type="text" placeholder="John" className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)]" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">Last Name</label>
                      <input type="text" placeholder="Smith" className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">Company / Organization</label>
                    <input type="text" placeholder="Your Company Name" className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">Email Address</label>
                    <input type="email" placeholder="john@company.com" className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">Inquiry Type</label>
                    <select className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)] bg-white">
                      <option value="">Select inquiry type...</option>
                      <option>Freight / Load Opportunity</option>
                      <option>Broker Partnership</option>
                      <option>Commercial Delivery Services</option>
                      <option>Investment / Funding</option>
                      <option>General Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[oklch(0.52_0.04_250)] uppercase tracking-wide block mb-1">Message</label>
                    <textarea rows={4} placeholder="Describe your freight needs or inquiry..." className="w-full border border-[oklch(0.91_0.01_240)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.45_0.18_258)]/30 focus:border-[oklch(0.45_0.18_258)] resize-none" />
                  </div>
                  <button
                    onClick={() => alert("Thank you for your inquiry. We will respond within 1 business day.")}
                    className="w-full bg-[oklch(0.45_0.18_258)] hover:bg-[oklch(0.50_0.20_258)] text-white font-bold py-3 rounded-xl transition-all text-sm"
                  >
                    Submit Inquiry
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 250) 0%, oklch(0.28 0.09 250) 100%)" }}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-black text-sm"
                  style={{ background: "oklch(0.45 0.18 258)" }}
                >
                  WV
                </div>
                <div>
                  <div className="font-display font-bold text-white text-sm">WV Transport &amp; Logistics, LLC</div>
                  <div className="text-[oklch(0.7_0.04_240)] text-xs">Pennsylvania, USA</div>
                </div>
              </div>
              <p className="text-[oklch(0.7_0.04_240)] text-xs leading-relaxed">
                Professional logistics and transportation services focused on cargo van freight, brokered load support, and operational excellence.
              </p>
            </div>
            <div>
              <div className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">Quick Links</div>
              <div className="grid grid-cols-2 gap-1">
                {NAV_SECTIONS.slice(0, 8).map(s => (
                  <a key={s.id} href={`#${s.id}`} className="text-[oklch(0.7_0.04_240)] hover:text-white text-xs transition-colors py-0.5">
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">Contact</div>
              <div className="space-y-1.5 text-xs text-[oklch(0.7_0.04_240)]">
                <div>502 W 7th St, Suite 100, Erie, PA 16502</div>
                <div>(267) 390-3204</div>
                <div>info@wvtransports.com</div>
                <div>wvtransports.com</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[oklch(0.6_0.04_240)] text-xs">
              © 2026 WV Transport &amp; Logistics, LLC. All rights reserved.
            </p>
            <p className="text-[oklch(0.6_0.04_240)] text-xs">
              This document is a business plan prepared for investor and banking review purposes.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
