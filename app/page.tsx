import Link from "next/link";
import { TrendingUp, Shield, Calculator, Users2 } from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Wealth Projections", desc: "Monthly compounding with inflation-adjusted views", gradient: "linear-gradient(135deg, #ac9121 0%, #d4b84a 100%)" },
  { icon: Calculator, title: "Tax Engine", desc: "SARS brackets, rebates, and CGT calculations", gradient: "linear-gradient(135deg, #1a5e3a 0%, #2f9464 100%)" },
  { icon: Shield, title: "Scenario Modelling", desc: "What-if analysis for retirement and expenses", gradient: "linear-gradient(135deg, #1e4a7a 0%, #2f6fbd 100%)" },
  { icon: Users2, title: "Family Planning", desc: "Dual-age timelines for couples", gradient: "linear-gradient(135deg, #7a4a1e 0%, #c9822b 100%)" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #faf8f3 0%, #f0ebe0 40%, #e4ddd0 100%)" }}>
      {/* Nav */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-8)",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #ac9121 0%, #c9a82e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(172, 145, 33, 0.3)",
            }}
          >
            <TrendingUp size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "var(--text-lg)", letterSpacing: "-0.02em", color: "var(--gray-900)" }}>
            Wealth Projector
          </span>
        </div>
        <Link href="/login" className="landing-login">
          Log in
        </Link>
      </header>

      {/* Hero */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 var(--space-8)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--gray-900)",
              margin: 0,
            }}
          >
            See the future of
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #ac9121 0%, #c9822b 50%, #2f6fbd 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              every rand.
            </span>
          </h1>
          <p
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--gray-500)",
              marginTop: "var(--space-5)",
              lineHeight: 1.6,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Project wealth, model scenarios, and plan tax-efficient strategies for your clients — all in one place.
          </p>
          <div style={{ marginTop: "var(--space-8)", display: "flex", gap: "var(--space-4)", justifyContent: "center" }}>
            <Link href="/login" className="landing-cta">
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Feature cards — single row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-4)",
            maxWidth: 960,
            width: "100%",
            marginTop: "clamp(3rem, 6vw, 5rem)",
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="landing-card"
              style={{
                background: f.gradient,
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="landing-card-circle" />
              <f.icon size={22} className="landing-card-icon" />
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: 0, color: "#fff", position: "relative" }}>{f.title}</h3>
              <p style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.75)", margin: "var(--space-2) 0 0 0", lineHeight: 1.5, position: "relative" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "var(--space-6) var(--space-8)", color: "var(--gray-400)", fontSize: "var(--text-xs)" }}>
        Wealth Projector — Built for South African financial advisors
      </footer>

      <style>{landingStyles}</style>
    </div>
  );
}

const landingStyles = `
  /* Login button */
  .landing-login {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px 24px;
    background: linear-gradient(135deg, #2c2518 0%, #4a3d28 100%);
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
    font-size: var(--text-sm);
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
  }
  .landing-login:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    background: linear-gradient(135deg, #3d3424 0%, #5c4e34 100%);
  }
  .landing-login:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }

  /* CTA button */
  .landing-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 14px 36px;
    background: linear-gradient(135deg, #ac9121 0%, #c9a82e 100%);
    color: #fff;
    border-radius: 10px;
    font-weight: 600;
    font-size: var(--text-base);
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(172, 145, 33, 0.35);
    transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 250ms ease;
  }
  .landing-cta:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 30px rgba(172, 145, 33, 0.45);
  }
  .landing-cta:active {
    transform: translateY(-1px) scale(1);
    box-shadow: 0 4px 16px rgba(172, 145, 33, 0.35);
  }

  /* Feature cards */
  .landing-card {
    padding: var(--space-5);
    border-radius: 14px;
    text-align: left;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease;
    cursor: default;
    animation: cardFadeIn 500ms ease both;
  }
  .landing-card:hover {
    transform: translateY(-6px) scale(1.03);
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
  }

  /* Decorative circle — grows on hover */
  .landing-card-circle {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    transition: transform 400ms ease, opacity 400ms ease;
  }
  .landing-card:hover .landing-card-circle {
    transform: scale(1.8);
    opacity: 0.18;
  }

  /* Icon nudge on hover */
  .landing-card-icon {
    color: rgba(255,255,255,0.9);
    margin-bottom: var(--space-3);
    position: relative;
    transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .landing-card:hover .landing-card-icon {
    transform: translateY(-2px) scale(1.15);
  }

  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
