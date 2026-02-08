"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Shield,
  Calculator,
  Users2,
  ArrowRight,
  BarChart3,
  Landmark,
  Calendar,
  FileText,
  LayoutDashboard,
  CheckCircle2,
  Star,
  ChevronRight,
  Lock,
  Globe,
  Zap,
} from "lucide-react";

/* ── Data ──────────────────────────────────────────────── */

const features = [
  { icon: TrendingUp, title: "Wealth Projections", desc: "Monthly compounding with inflation-adjusted growth views over any time horizon." },
  { icon: Calculator, title: "Tax Engine", desc: "SARS-aligned brackets, rebates, medical credits and CGT — always up to date." },
  { icon: BarChart3, title: "Scenario Modelling", desc: "Compare what-if scenarios side by side to stress-test every plan." },
  { icon: Users2, title: "Family Planning", desc: "Dual-age timelines for couples with independent retirement dates." },
  { icon: Landmark, title: "Retirement Withdrawals", desc: "Smart drawdown sequencing with tax-aware liquidation ordering." },
  { icon: Calendar, title: "Capital Events", desc: "Model lump sums, property sales, and windfalls at any point in time." },
  { icon: FileText, title: "Detailed Calculations", desc: "Full transparency — drill into every year, every rand, every assumption." },
  { icon: LayoutDashboard, title: "Client Dashboard", desc: "One view per client family with projections, scenarios and settings." },
];

const steps = [
  { num: "1", icon: Users2, title: "Add your client", desc: "Capture income, expenses, assets and goals in minutes." },
  { num: "2", icon: TrendingUp, title: "Build the plan", desc: "The engine projects growth, tax and withdrawals automatically." },
  { num: "3", icon: FileText, title: "Present with clarity", desc: "Share visual, year-by-year projections your clients actually understand." },
];

const trustItems = [
  { icon: Calculator, label: "SARS-aligned tax engine" },
  { icon: Lock, label: "Bank-grade encryption" },
  { icon: Shield, label: "FSCA-ready reporting" },
  { icon: Globe, label: "South African built" },
];

const benefits = [
  "Year-by-year projections that update in real time",
  "Tax engine aligned to the latest SARS brackets",
  "Side-by-side scenario comparison for every plan",
  "Support for couples with different retirement dates",
  "Smart withdrawal sequencing across account types",
  "Clean, visual reports your clients will understand",
];

const testimonials = [
  { name: "Johan van der Merwe", role: "CFP® — Stellenbosch", initials: "JM", quote: "Wealth Plan replaced three different spreadsheets I was maintaining. My clients love the visual projections." },
  { name: "Naledi Khumalo", role: "Independent FA — Johannesburg", initials: "NK", quote: "The tax engine alone saves me hours every quarter. Finally, a tool that understands South African tax law." },
  { name: "David Erasmus", role: "Wealth Planner — Cape Town", initials: "DE", quote: "I used to dread the 'what if' questions. Now I model scenarios in front of my clients in real time." },
];

/* ── Component ─────────────────────────────────────────── */

export default function LandingPage() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const els = document.querySelectorAll(".lp-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("lp-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-root">
      {/* ── Sticky Nav ──────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-left">
            <div className="lp-logo-icon">
              <TrendingUp size={18} color="#fff" />
            </div>
            <span className="lp-logo-text">Wealth Plan</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how-it-works" className="lp-nav-link">How it Works</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
          </div>
          <div className="lp-nav-actions">
            <Link href="/login" className="lp-btn-ghost-nav">Log in</Link>
            <Link href="/login" className="lp-btn-primary-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-container lp-hero-content">
          <div className="lp-badge lp-reveal">
            <Zap size={14} />
            Built for South African financial planners
          </div>
          <h1 className="lp-hero-h1 lp-reveal" style={{ transitionDelay: "100ms" }}>
            Financial planning your
            <br />
            clients can <span className="lp-gold-text">see.</span>
          </h1>
          <p className="lp-hero-sub lp-reveal" style={{ transitionDelay: "200ms" }}>
            Project wealth, model scenarios, and plan tax-efficient retirement strategies — purpose-built for independent financial planners in South Africa.
          </p>
          <div className="lp-hero-ctas lp-reveal" style={{ transitionDelay: "300ms" }}>
            <Link href="/login" className="lp-btn-primary">
              Start Planning
              <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="lp-btn-ghost">
              See how it works
              <ChevronRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ───────────────────────────────── */}
      <section className="lp-trust lp-reveal">
        <div className="lp-container lp-trust-inner">
          {trustItems.map((t) => (
            <div key={t.label} className="lp-trust-item">
              <t.icon size={18} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <p className="lp-section-label">Features</p>
            <h2 className="lp-section-title">Everything you need to plan with confidence</h2>
            <p className="lp-section-sub">A complete financial planning engine — not just another spreadsheet.</p>
          </div>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className="lp-feature-card lp-reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="lp-feature-icon-wrap">
                  <f.icon size={22} />
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section id="how-it-works" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-section-title">From client to plan in three steps</h2>
          </div>
          <div className="lp-steps">
            {steps.map((s, i) => (
              <div key={s.num} className="lp-step lp-reveal" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="lp-step-num">{s.num}</div>
                <div className="lp-step-icon-wrap">
                  <s.icon size={28} />
                </div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container lp-benefits">
          <div className="lp-benefits-text lp-reveal">
            <p className="lp-section-label">Why Wealth Plan</p>
            <h2 className="lp-section-title" style={{ textAlign: "left" }}>Stop wrestling with spreadsheets</h2>
            <p className="lp-benefits-sub">Purpose-built software replaces fragile, error-prone spreadsheets with a reliable engine your practice can grow on.</p>
            <ul className="lp-benefits-list">
              {benefits.map((b) => (
                <li key={b} className="lp-benefits-item">
                  <CheckCircle2 size={18} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-benefits-visual lp-reveal" style={{ transitionDelay: "150ms" }}>
            <div className="lp-mock-card">
              <div className="lp-mock-header">
                <div className="lp-mock-dot" />
                <div className="lp-mock-dot" />
                <div className="lp-mock-dot" />
              </div>
              <div className="lp-mock-chart">
                <div className="lp-mock-bar" style={{ height: "30%" }} />
                <div className="lp-mock-bar" style={{ height: "45%" }} />
                <div className="lp-mock-bar" style={{ height: "55%" }} />
                <div className="lp-mock-bar" style={{ height: "50%" }} />
                <div className="lp-mock-bar" style={{ height: "65%" }} />
                <div className="lp-mock-bar" style={{ height: "72%" }} />
                <div className="lp-mock-bar lp-mock-bar-accent" style={{ height: "85%" }} />
                <div className="lp-mock-bar lp-mock-bar-accent" style={{ height: "95%" }} />
              </div>
              <div className="lp-mock-label">Projected wealth growth</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <p className="lp-section-label">Testimonials</p>
            <h2 className="lp-section-title">Trusted by planners across South Africa</h2>
          </div>
          <div className="lp-testimonials">
            {testimonials.map((t, i) => (
              <div key={t.name} className="lp-testimonial-card lp-reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="lp-stars">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} fill="var(--brand-400)" color="var(--brand-400)" />
                  ))}
                </div>
                <p className="lp-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="lp-testimonial-author">
                  <div className="lp-avatar">{t.initials}</div>
                  <div>
                    <div className="lp-author-name">{t.name}</div>
                    <div className="lp-author-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────── */}
      <section id="pricing" className="lp-cta-section">
        <div className="lp-cta-glow" />
        <div className="lp-container lp-cta-inner lp-reveal">
          <h2 className="lp-cta-title">Ready to modernise your practice?</h2>
          <p className="lp-cta-sub">Join South African financial planners who are building better plans, faster.</p>
          <Link href="/login" className="lp-btn-primary lp-btn-primary-lg">
            Join the Waitlist
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="lp-nav-left">
              <div className="lp-logo-icon">
                <TrendingUp size={18} color="#fff" />
              </div>
              <span className="lp-logo-text" style={{ color: "var(--gray-300)" }}>Wealth Plan</span>
            </div>
            <p className="lp-footer-desc">Purpose-built financial planning software for independent advisors in South Africa.</p>
          </div>
          <div className="lp-footer-col">
            <h4 className="lp-footer-heading">Product</h4>
            <a href="#features" className="lp-footer-link">Features</a>
            <a href="#how-it-works" className="lp-footer-link">How it Works</a>
            <a href="#pricing" className="lp-footer-link">Pricing</a>
          </div>
          <div className="lp-footer-col">
            <h4 className="lp-footer-heading">Company</h4>
            <a href="#" className="lp-footer-link">About</a>
            <a href="#" className="lp-footer-link">Contact</a>
            <a href="#" className="lp-footer-link">Privacy Policy</a>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Wealth Plan. All rights reserved.</span>
        </div>
      </footer>

      <style>{lpStyles}</style>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const lpStyles = `
  /* ── Reset for landing ─────────────────────── */
  .lp-root {
    min-height: 100vh;
    background: var(--surface-primary);
    overflow-x: hidden;
  }

  .lp-container {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 var(--space-6);
  }

  /* ── Reveal animation ──────────────────────── */
  .lp-reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .lp-visible {
    opacity: 1;
    transform: translateY(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }

  /* ── Sticky Nav ────────────────────────────── */
  .lp-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-default);
  }
  .lp-nav-inner {
    max-width: 1140px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-6);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lp-nav-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .lp-logo-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-400) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(172, 145, 33, 0.3);
    flex-shrink: 0;
  }
  .lp-logo-text {
    font-weight: 700;
    font-size: var(--text-lg);
    letter-spacing: -0.02em;
    color: var(--gray-900);
  }
  .lp-nav-links {
    display: flex;
    gap: var(--space-8);
  }
  .lp-nav-link {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--gray-600);
    text-decoration: none;
    transition: color var(--transition-fast);
  }
  .lp-nav-link:hover { color: var(--gray-900); }
  .lp-nav-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .lp-btn-ghost-nav {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--gray-700);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 8px;
    transition: background var(--transition-fast);
  }
  .lp-btn-ghost-nav:hover { background: var(--gray-100); }
  .lp-btn-primary-sm {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 20px;
    background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-400) 100%);
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
    font-size: var(--text-sm);
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(172, 145, 33, 0.25);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  .lp-btn-primary-sm:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(172, 145, 33, 0.35);
  }

  /* ── Hero ───────────────────────────────────── */
  .lp-hero {
    position: relative;
    padding: 120px 0 80px;
    text-align: center;
    overflow: hidden;
  }
  .lp-hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 50% 0%, rgba(172, 145, 33, 0.08) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 80% 20%, rgba(172, 145, 33, 0.05) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 20% 30%, rgba(201, 168, 46, 0.04) 0%, transparent 60%);
    pointer-events: none;
  }
  .lp-hero-content {
    position: relative;
  }
  .lp-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 16px;
    border-radius: 999px;
    background: var(--brand-50);
    color: var(--brand-700);
    font-size: var(--text-sm);
    font-weight: 500;
    margin-bottom: var(--space-6);
  }
  .lp-hero-h1 {
    font-size: clamp(2.5rem, 5.5vw, 4.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.08;
    color: var(--gray-900);
    margin: 0;
  }
  .lp-gold-text {
    background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-300) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-hero-sub {
    font-size: var(--text-lg);
    color: var(--gray-500);
    margin: var(--space-5) auto 0;
    line-height: 1.65;
    max-width: 560px;
  }
  .lp-hero-ctas {
    margin-top: var(--space-8);
    display: flex;
    gap: var(--space-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ── Buttons ────────────────────────────────── */
  .lp-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 14px 32px;
    background: linear-gradient(135deg, var(--brand-500) 0%, var(--brand-400) 100%);
    color: #fff;
    border-radius: 10px;
    font-weight: 600;
    font-size: var(--text-base);
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(172, 145, 33, 0.3);
    transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease;
    border: none;
    cursor: pointer;
  }
  .lp-btn-primary:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 30px rgba(172, 145, 33, 0.4);
  }
  .lp-btn-primary:active {
    transform: translateY(0) scale(1);
  }
  .lp-btn-primary-lg {
    padding: 16px 40px;
    font-size: var(--text-lg);
  }
  .lp-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 14px 28px;
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--gray-700);
    border-radius: 10px;
    font-weight: 600;
    font-size: var(--text-base);
    text-decoration: none;
    transition: background var(--transition-fast), color var(--transition-fast);
    cursor: pointer;
  }
  .lp-btn-ghost:hover {
    background: var(--gray-50);
    color: var(--gray-900);
  }

  /* ── Trust Bar ──────────────────────────────── */
  .lp-trust {
    padding: var(--space-10) 0;
    border-bottom: 1px solid var(--border-default);
  }
  .lp-trust-inner {
    display: flex;
    justify-content: center;
    gap: var(--space-10);
    flex-wrap: wrap;
  }
  .lp-trust-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--gray-500);
  }
  .lp-trust-item svg { color: var(--brand-500); }

  /* ── Sections ───────────────────────────────── */
  .lp-section {
    padding: 80px 0;
  }
  .lp-section-alt {
    background: var(--gray-50);
  }
  .lp-section-header {
    text-align: center;
    max-width: 600px;
    margin: 0 auto var(--space-12);
  }
  .lp-section-label {
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--brand-500);
    margin: 0 0 var(--space-3) 0;
  }
  .lp-section-title {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: var(--gray-900);
    margin: 0;
  }
  .lp-section-sub {
    font-size: var(--text-base);
    color: var(--gray-500);
    margin: var(--space-4) 0 0 0;
    line-height: 1.6;
  }

  /* ── Features Grid ──────────────────────────── */
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-5);
  }
  .lp-feature-card {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: 14px;
    padding: var(--space-6);
    transition: transform var(--transition-base), box-shadow var(--transition-base);
    cursor: default;
  }
  .lp-feature-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }
  .lp-feature-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: var(--brand-50);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-600);
    margin-bottom: var(--space-4);
  }
  .lp-feature-title {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--space-2) 0;
  }
  .lp-feature-desc {
    font-size: var(--text-sm);
    color: var(--gray-500);
    line-height: 1.55;
    margin: 0;
  }

  /* ── How It Works ───────────────────────────── */
  .lp-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-8);
    text-align: center;
  }
  .lp-step {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .lp-step-num {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: var(--brand-500);
    color: #fff;
    font-size: var(--text-sm);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-4);
  }
  .lp-step-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--brand-500);
    margin-bottom: var(--space-4);
    box-shadow: var(--shadow-sm);
  }
  .lp-step-title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--gray-900);
    margin: 0 0 var(--space-2) 0;
  }
  .lp-step-desc {
    font-size: var(--text-sm);
    color: var(--gray-500);
    line-height: 1.55;
    margin: 0;
    max-width: 280px;
  }

  /* ── Benefits ───────────────────────────────── */
  .lp-benefits {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-16);
    align-items: center;
  }
  .lp-benefits-sub {
    font-size: var(--text-base);
    color: var(--gray-500);
    line-height: 1.6;
    margin: var(--space-4) 0 var(--space-6) 0;
  }
  .lp-benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .lp-benefits-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--gray-700);
    line-height: 1.5;
  }
  .lp-benefits-item svg {
    color: var(--success-500);
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── Mock Chart Card ────────────────────────── */
  .lp-mock-card {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: 16px;
    padding: var(--space-6);
    box-shadow: var(--shadow-lg);
  }
  .lp-mock-header {
    display: flex;
    gap: 6px;
    margin-bottom: var(--space-5);
  }
  .lp-mock-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--gray-200);
  }
  .lp-mock-chart {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3);
    height: 160px;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--border-default);
  }
  .lp-mock-bar {
    flex: 1;
    background: var(--gray-200);
    border-radius: 4px 4px 0 0;
    transition: height 0.6s ease;
  }
  .lp-mock-bar-accent {
    background: linear-gradient(180deg, var(--brand-400) 0%, var(--brand-500) 100%);
  }
  .lp-mock-label {
    font-size: var(--text-xs);
    color: var(--gray-400);
    margin-top: var(--space-3);
    text-align: center;
  }

  /* ── Testimonials ───────────────────────────── */
  .lp-testimonials {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
  }
  .lp-testimonial-card {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: 14px;
    padding: var(--space-6);
  }
  .lp-stars {
    display: flex;
    gap: 2px;
    margin-bottom: var(--space-4);
  }
  .lp-testimonial-quote {
    font-size: var(--text-sm);
    color: var(--gray-700);
    line-height: 1.65;
    margin: 0 0 var(--space-5) 0;
  }
  .lp-testimonial-author {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .lp-avatar {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--brand-100) 0%, var(--brand-200) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--brand-700);
    flex-shrink: 0;
  }
  .lp-author-name {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--gray-900);
  }
  .lp-author-role {
    font-size: var(--text-xs);
    color: var(--gray-400);
  }

  /* ── CTA Section ────────────────────────────── */
  .lp-cta-section {
    position: relative;
    background: var(--gray-900);
    padding: 80px 0;
    text-align: center;
    overflow: hidden;
  }
  .lp-cta-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 50% 60% at 50% 100%, rgba(172, 145, 33, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .lp-cta-inner {
    position: relative;
  }
  .lp-cta-title {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    margin: 0;
  }
  .lp-cta-sub {
    font-size: var(--text-lg);
    color: var(--gray-400);
    margin: var(--space-4) 0 var(--space-8) 0;
  }

  /* ── Footer ─────────────────────────────────── */
  .lp-footer {
    background: var(--gray-950);
    padding: var(--space-16) 0 var(--space-8);
    color: var(--gray-400);
  }
  .lp-footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-12);
  }
  .lp-footer-brand {}
  .lp-footer-desc {
    font-size: var(--text-sm);
    line-height: 1.6;
    margin: var(--space-4) 0 0 0;
    max-width: 320px;
    color: var(--gray-500);
  }
  .lp-footer-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .lp-footer-heading {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--gray-300);
    margin: 0 0 var(--space-2) 0;
  }
  .lp-footer-link {
    font-size: var(--text-sm);
    color: var(--gray-500);
    text-decoration: none;
    transition: color var(--transition-fast);
  }
  .lp-footer-link:hover { color: var(--gray-300); }
  .lp-footer-bottom {
    margin-top: var(--space-12);
    padding-top: var(--space-6);
    border-top: 1px solid rgba(255,255,255,0.08);
    font-size: var(--text-xs);
    color: var(--gray-600);
  }

  /* ── Responsive ─────────────────────────────── */
  @media (max-width: 1024px) {
    .lp-features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .lp-footer-grid {
      grid-template-columns: 1fr 1fr;
      gap: var(--space-8);
    }
    .lp-footer-brand {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .lp-nav-links { display: none; }
    .lp-hero { padding: 100px 0 60px; }
    .lp-steps {
      grid-template-columns: 1fr;
      gap: var(--space-10);
    }
    .lp-benefits {
      grid-template-columns: 1fr;
      gap: var(--space-8);
    }
    .lp-testimonials {
      grid-template-columns: 1fr;
    }
    .lp-trust-inner {
      gap: var(--space-5);
    }
  }

  @media (max-width: 640px) {
    .lp-features-grid {
      grid-template-columns: 1fr;
    }
    .lp-hero-h1 {
      font-size: clamp(2rem, 8vw, 2.75rem);
    }
    .lp-hero-ctas {
      flex-direction: column;
      align-items: center;
    }
    .lp-section { padding: 60px 0; }
    .lp-cta-section { padding: 60px 0; }
    .lp-footer-grid {
      grid-template-columns: 1fr;
    }
  }
`;
