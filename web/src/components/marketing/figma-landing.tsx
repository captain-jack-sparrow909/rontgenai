"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { joinWaitlist } from "@/lib/api";
import {
  Layers, Database, Network, Shield, GitPullRequest, AlertTriangle,
  CircleDot, ShieldCheck, Waves, Target, ArrowRight,
  ExternalLink, Eye, Cpu, Zap, ChevronRight, Sparkles, Activity,
  Workflow,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductStatus = "v1" | "coming-soon";
type TerminalTab = "radar" | "atlas" | "sentinel";

interface Product {
  id: string; name: string; status: ProductStatus;
  desc: string; longDesc: string; color: string; glow: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}
interface TerminalLine {
  text: string;
  type: "cmd"|"blank"|"info"|"header"|"divider"|"field"|"sub"|"step"|"meta"|"warn"|"ok"|"critical";
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .7A11.5 11.5 0 0 0 8.36 23.1c.58.1.79-.25.79-.56v-2.22c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.39.97.1-.75.4-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18A10.98 10.98 0 0 1 12 6.12c.98 0 1.95.13 2.86.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.24c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

const products: Product[] = [
  { id:"blueprint", name:"Blueprint", status:"v1", desc:"Architecture diagram review",
    longDesc:"Upload any architecture diagram. Get instant analysis of bottlenecks, single points of failure, and improvement paths.",
    color:"#3B82F6", glow:"rgba(59,130,246,0.14)", Icon:Layers },
  { id:"pulse", name:"Pulse", status:"v1", desc:"Chat with spreadsheets & SQL",
    longDesc:"Connect your data sources. Ask questions in plain English. Get answers with the exact SQL behind every result.",
    color:"#10B981", glow:"rgba(16,185,129,0.14)", Icon:Database },
  { id:"atlas", name:"Atlas", status:"v1", desc:"GitHub repo explainer",
    longDesc:"Point Atlas at any repository. It maps the codebase, surfaces architecture decisions, and answers deep questions.",
    color:"#F59E0B", glow:"rgba(245,158,11,0.14)", Icon:Network },
  { id:"sentinel", name:"Sentinel", status:"v1", desc:"AI PR reviewer on GitHub",
    longDesc:"Installs as a GitHub App in 60 seconds. Reviews every pull request for bugs, security issues, and regressions.",
    color:"#EF4444", glow:"rgba(239,68,68,0.14)", Icon:Shield },
  { id:"forge", name:"Forge", status:"v1", desc:"Issue → plan → PR",
    longDesc:"Describe a feature or bug. Forge reasons about your codebase, writes a plan, and opens the pull request.",
    color:"#8B5CF6", glow:"rgba(139,92,246,0.14)", Icon:GitPullRequest },
  { id:"radar", name:"Radar", status:"v1", desc:"Production incident RCA",
    longDesc:"Feed Radar your logs, metrics, and traces. Get root cause analysis and precise remediation steps in seconds.",
    color:"#06B6D4", glow:"rgba(6,182,212,0.14)", Icon:AlertTriangle },
  { id:"relay", name:"Relay", status:"v1", desc:"CI pipeline optimization",
    longDesc:"Upload workflow and run evidence. Find critical paths, cache misses, flaky tests, and duplicated work with prioritized fixes.",
    color:"#818CF8", glow:"rgba(129,140,248,0.14)", Icon:Workflow },
  { id:"orbit",  name:"Orbit",  status:"coming-soon", desc:"AI job search copilot", longDesc:"", color:"#4B5563", glow:"", Icon:CircleDot },
  { id:"aegis",  name:"Aegis",  status:"coming-soon", desc:"AI customer support agent", longDesc:"", color:"#4B5563", glow:"", Icon:ShieldCheck },
  { id:"echo",   name:"Echo",   status:"coming-soon", desc:"AI meeting copilot", longDesc:"", color:"#4B5563", glow:"", Icon:Waves },
  { id:"arena",  name:"Arena",  status:"coming-soon", desc:"AI mock interview coach", longDesc:"", color:"#4B5563", glow:"", Icon:Target },
];

const TERMINAL: Record<TerminalTab, TerminalLine[]> = {
  radar: [
    { text:"$ rontgen radar --incident=PROD-4821", type:"cmd" },
    { text:"", type:"blank" },
    { text:"▸  Pulling telemetry   [14:23 UTC → 14:31 UTC]", type:"info" },
    { text:"▸  Correlating 1,204 spans across 9 services", type:"info" },
    { text:"▸  Isolating anomaly windows...", type:"info" },
    { text:"", type:"blank" },
    { text:"ROOT CAUSE IDENTIFIED", type:"header" },
    { text:"────────────────────────────────────────────────", type:"divider" },
    { text:"  Service     payment-gateway  v2.1.4", type:"field" },
    { text:"  Signal      p99 latency  +340%  @14:19 UTC", type:"field" },
    { text:"  Trigger     Redis eviction policy drift", type:"field" },
    { text:"              deployed by @devops-bot  14:17 UTC", type:"sub" },
    { text:"  Impact      3,200 failed transactions", type:"field" },
    { text:"", type:"blank" },
    { text:"REMEDIATION", type:"header" },
    { text:"────────────────────────────────────────────────", type:"divider" },
    { text:"  [1]  Rollback Redis: maxmemory-policy → volatile-lru", type:"step" },
    { text:"  [2]  Flush namespace: sessions:checkout:*", type:"step" },
    { text:"  [3]  Scale payment-gateway replicas: 3 → 6", type:"step" },
    { text:"", type:"blank" },
    { text:"Confidence 94%  ·  Analysis time 1.8s", type:"meta" },
  ],
  atlas: [
    { text:"$ rontgen atlas --repo=github.com/acme/core-api", type:"cmd" },
    { text:"", type:"blank" },
    { text:"▸  Indexing 3,847 files...", type:"info" },
    { text:"▸  Building dependency graph...", type:"info" },
    { text:"▸  Identifying patterns and anti-patterns...", type:"info" },
    { text:"", type:"blank" },
    { text:"ARCHITECTURE OVERVIEW", type:"header" },
    { text:"────────────────────────────────────────────────", type:"divider" },
    { text:"  Framework   Go 1.22  ·  gRPC + REST gateway", type:"field" },
    { text:"  Services    14 internal  ·  3 external", type:"field" },
    { text:"  Pattern     Hexagonal  (ports & adapters)", type:"field" },
    { text:"  Data        PostgreSQL  ·  Redis  ·  Kafka (8 topics)", type:"field" },
    { text:"", type:"blank" },
    { text:"FINDINGS", type:"header" },
    { text:"────────────────────────────────────────────────", type:"divider" },
    { text:"  ⚠  Circular dep detected: billing ↔ subscription", type:"warn" },
    { text:"  ⚠  3 services share database credentials", type:"warn" },
    { text:"  ⚡  auth/ has 0 unit tests  (892 LOC)", type:"warn" },
    { text:"  ✓  Error handling consistent across 12/14 services", type:"ok" },
    { text:"", type:"blank" },
    { text:"3,847 files  ·  Indexed in 2.1s", type:"meta" },
  ],
  sentinel: [
    { text:"$ rontgen sentinel review --pr=2847", type:"cmd" },
    { text:"", type:"blank" },
    { text:"▸  Analyzing diff  (+847 / -312 lines)", type:"info" },
    { text:"▸  Cross-referencing codebase context...", type:"info" },
    { text:"▸  Running security and logic checks...", type:"info" },
    { text:"", type:"blank" },
    { text:"PR REVIEW  —  feat/stripe-v3-migration", type:"header" },
    { text:"────────────────────────────────────────────────", type:"divider" },
    { text:"  Author   @sarah-chen", type:"field" },
    { text:"  Scope    payments/stripe.go  ·  webhook/handler.go", type:"field" },
    { text:"", type:"blank" },
    { text:"  🔴  [CRITICAL]  stripe.go:142  Missing idempotency key", type:"critical" },
    { text:"       on charge creation — risk of double-billing", type:"sub" },
    { text:"  🟡  [WARN]      handler.go:78  Raw panic on HTTP 500", type:"warn" },
    { text:"  🟢  [PASS]      Webhook signature validation ✓", type:"ok" },
    { text:"  🟢  [PASS]      Error propagation pattern ✓", type:"ok" },
    { text:"", type:"blank" },
    { text:"CHANGES REQUESTED  ·  2 issues, 0 blocking ✓", type:"meta" },
  ],
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useFadeInUp(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

function useCounter(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) { raf = requestAnimationFrame(tick); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger]);
  return value;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(window.scrollY / h, 1) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);
  return progress;
}

// ─── Scroll Progress Bar ─────────────────────────────────────────────────────

function ScrollProgressBar() {
  const progress = useScrollProgress();
  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] h-[2px] pointer-events-none">
      <div style={{
        height: "100%",
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, #00E5FF 0%, #6366F1 55%, #8B5CF6 100%)",
        boxShadow: "0 0 10px rgba(0,229,255,0.6), 0 0 20px rgba(99,102,241,0.3)",
        transition: "width 0.05s linear",
      }} />
    </div>
  );
}

// ─── Canvas Particles ─────────────────────────────────────────────────────────

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 75 }, () => ({
      x: Math.random() * 800, y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.1 + 0.3,
    }));
    const tick = () => {
      if (w > 0) {
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        });
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 16000) {
              ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
              ctx.strokeStyle = `rgba(0,229,255,${(1 - d2 / 16000) * 0.07})`;
              ctx.lineWidth = 0.6; ctx.stroke();
            }
          }
        }
        pts.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,229,255,0.16)"; ctx.fill();
        });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Aurora (scroll-aware) ────────────────────────────────────────────────────

function Aurora({ intensity = 1, scrollOffset = 0 }: { intensity?: number; scrollOffset?: number }) {
  // Hue shifts: 0=cyan, 0.4=indigo, 0.7=amber/purple, 1=purple
  const t = scrollOffset;
  const c1a = Math.max(0, (0.065 - t * 0.03) * intensity);
  const c2a = Math.max(0, (0.05 + t * 0.02) * intensity);
  const c3a = Math.max(0, (0.04 + t * 0.025) * intensity);
  const c4a = Math.max(0, (0.04 + t * 0.04) * intensity);
  const c5a = Math.max(0, 0.025 * intensity);

  // Parallax shift — each blob drifts at different speed
  const p1 = scrollOffset * -12;
  const p2 = scrollOffset * -7;
  const p3 = scrollOffset * -18;

  const blobs = [
    { color:`rgba(0,229,255,${c1a})`,    w:"65%", h:"55%", top:`calc(2% + ${p1}px)`,  left:"60%", anim:"aurora1 15s ease-in-out infinite",    blur:80 },
    { color:`rgba(99,102,241,${c2a})`,   w:"55%", h:"55%", top:`calc(35% + ${p2}px)`, left:"8%",  anim:"aurora2 19s ease-in-out infinite",    blur:80 },
    { color:`rgba(6,182,212,${c3a})`,    w:"40%", h:"40%", top:`calc(65% + ${p3}px)`, left:"75%", anim:"aurora3 12s ease-in-out infinite",    blur:60 },
    { color:`rgba(139,92,246,${c4a})`,   w:"38%", h:"38%", top:`calc(12% + ${p1}px)`, left:"30%", anim:"aurora1 17s ease-in-out infinite 4s", blur:70 },
    { color:`rgba(16,185,129,${c5a})`,   w:"28%", h:"28%", top:`calc(80% + ${p2}px)`, left:"15%", anim:"aurora2 22s ease-in-out infinite 2s", blur:60 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {blobs.map((b, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            background:`radial-gradient(ellipse at center, ${b.color} 0%, transparent 70%)`,
            width:b.w, height:b.h, top:b.top, left:b.left,
            filter:`blur(${b.blur}px)`, animation:b.anim,
            transform:"translate(-50%,-50%)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Rotating Border ──────────────────────────────────────────────────────────

function RotatingBorder({ children, radius = 20, speed = "8s", colors }: {
  children: React.ReactNode; radius?: number; speed?: string; colors: string;
}) {
  return (
    <div className="relative p-[1px]" style={{ borderRadius:radius }}>
      <div className="absolute inset-0 rounded-[inherit] overflow-hidden">
        <div style={{
          position:"absolute", inset:"-50%",
          background:`conic-gradient(from 0deg, ${colors})`,
          animation:`spin ${speed} linear infinite`,
          opacity:0.55,
        }} />
      </div>
      <div className="relative rounded-[inherit] overflow-hidden" style={{ zIndex:1 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────

function MagneticButton({ children, className, style, href, onClick, type }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const strength = 0.38;

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setOffset({
      x: (e.clientX - cx) * strength,
      y: (e.clientY - cy) * strength,
    });
  };

  const handleLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const magnetStyle: React.CSSProperties = {
    ...style,
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: offset.x === 0 && offset.y === 0
      ? "transform 0.6s cubic-bezier(0.34,1.4,0.64,1)"
      : "transform 0.15s ease-out",
  };

  if (href) {
    return (
      <a ref={ref as React.RefObject<HTMLAnchorElement>} href={href}
        className={className} style={magnetStyle}
        onMouseMove={handleMove} onMouseLeave={handleLeave}
      >
        {children}
      </a>
    );
  }
  return (
    <button ref={ref as React.RefObject<HTMLButtonElement>}
      className={className} style={magnetStyle} type={type ?? "button"}
      onClick={onClick} onMouseMove={handleMove} onMouseLeave={handleLeave}
    >
      {children}
    </button>
  );
}

// ─── Word Reveal Text ────────────────────────────────────────────────────────

function RevealText({ children, visible, delay = 0, style, as: Tag = "h2" }: {
  children: string;
  visible: boolean;
  delay?: number;
  style?: React.CSSProperties;
  as?: "h2" | "div" | "span";
}) {
  const words = children.split(" ");
  return (
    <Tag style={{ ...style, display:"block" }}>
      {words.map((word, i) => (
        <span key={i} style={{ display:"inline-block", overflow:"hidden", marginRight:"0.28em", verticalAlign:"bottom" }}>
          <span style={{
            display:"inline-block",
            transform: visible ? "translateY(0) rotateX(0deg)" : "translateY(110%) rotateX(-25deg)",
            opacity: visible ? 1 : 0,
            transition: `transform 0.72s cubic-bezier(0.22,1,0.36,1) ${delay + i * 38}ms, opacity 0.55s ease ${delay + i * 38}ms`,
            transformOrigin:"bottom center",
          }}>
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}

// ─── Product Card (with 3D tilt) ──────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false);
  const [shimmerKey, setShimmerKey] = useState(0);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLAnchorElement>(null);
  const isLive = product.status === "v1";
  const { Icon } = product;

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width;   // 0–1
    const ny = (e.clientY - rect.top) / rect.height;    // 0–1
    setMouse({ x: nx * 100, y: ny * 100 });
    // rotateY positive = right side tilts toward viewer
    setTilt({ x: (ny - 0.5) * -12, y: (nx - 0.5) * 14 });
  };

  const handleMouseEnter = () => {
    setHovered(true);
    setShimmerKey(k => k + 1);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const tiltTransform = isLive && hovered
    ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale(1.008)`
    : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";

  return (
    <a ref={cardRef} href={isLive ? `/app/${product.id}` : "#waitlist"}
      className="relative cursor-pointer overflow-hidden"
      style={{
        borderRadius:16,
        border:`1px solid ${hovered && isLive ? product.color+"50" : "rgba(255,255,255,0.055)"}`,
        background:"rgba(10,13,22,0.9)",
        backdropFilter:"blur(24px)",
        transform: tiltTransform,
        boxShadow:hovered && isLive
          ? `0 0 0 1px ${product.color}10, 0 24px 70px rgba(0,0,0,0.65), 0 0 120px ${product.color}0C, inset 0 1px 0 ${product.color}22`
          : "0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        transition:"all 0.38s cubic-bezier(0.34,1.4,0.64,1)",
        transformStyle:"preserve-3d",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {isLive && hovered && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex:0, borderRadius:16 }}>
          <div style={{
            position:"absolute", inset:0, borderRadius:16,
            background:`radial-gradient(320px circle at ${mouse.x}% ${mouse.y}%, ${product.color}12 0%, transparent 65%)`,
          }} />
        </div>
      )}
      {isLive && shimmerKey > 0 && (
        <div key={shimmerKey} className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex:1, borderRadius:16 }}>
          <div style={{
            position:"absolute", top:0, bottom:0, width:"55%",
            background:`linear-gradient(108deg, transparent 0%, ${product.color}12 50%, transparent 100%)`,
            animation:"shimmerSlide 0.8s ease-out forwards",
          }} />
        </div>
      )}
      <div className="absolute left-0 top-6 bottom-6 w-[2.5px] rounded-full"
        style={{
          background:isLive ? `linear-gradient(to bottom, ${product.color}${hovered?"FF":"66"}, transparent)` : "transparent",
          transition:"all 0.3s ease",
        }}
      />
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none rounded-t-2xl"
          style={{
            background:`linear-gradient(to bottom, ${product.color}0A, transparent)`,
            opacity:hovered ? 1 : 0.5, transition:"opacity 0.35s ease",
          }}
        />
      )}
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="p-[10px] rounded-xl"
            style={{
              background:isLive ? (hovered ? product.color+"22" : product.color+"0C") : "rgba(55,65,81,0.1)",
              border:`1px solid ${isLive ? product.color+(hovered?"44":"18") : "rgba(55,65,81,0.15)"}`,
              transform:hovered && isLive ? "rotate(-6deg) scale(1.08)" : "none",
              transition:"transform 0.4s cubic-bezier(0.34,1.4,0.64,1), background 0.3s, border-color 0.3s",
              boxShadow:hovered && isLive ? `0 0 20px ${product.color}20` : "none",
            }}
          >
            <Icon className="w-5 h-5" style={{ color:isLive ? product.color : "#374151" }} />
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md tracking-wider"
            style={{
              background:isLive ? product.color+"0C" : "rgba(55,65,81,0.08)",
              color:isLive ? product.color+"CC" : "#374151",
              border:`1px solid ${isLive ? product.color+"20" : "rgba(55,65,81,0.12)"}`,
              fontFamily:"var(--font-jetbrains-mono),monospace",
            }}
          >
            {isLive ? "v1 · live" : "soon"}
          </span>
        </div>
        <h3 className="mb-1.5" style={{
          fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:600, fontSize:"22px",
          color:isLive ? "#EDF2F7" : "#1E2A38", letterSpacing:"0.015em", lineHeight:1.1,
        }}>
          {product.name}
        </h3>
        <p className="text-[13px] mb-3.5" style={{ color:isLive ? "#5A6A7A" : "#1E2A38", fontFamily:"var(--font-inter),sans-serif" }}>
          {product.desc}
        </p>
        {isLive && (
          <p className="text-[12.5px] leading-relaxed mb-5" style={{ color:"#3D4D5C", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.75 }}>
            {product.longDesc}
          </p>
        )}
        {isLive ? (
          <div className="flex items-center gap-1.5 text-xs font-medium"
            style={{
              color:hovered ? product.color : "#2A3A4A",
              fontFamily:"var(--font-inter),sans-serif",
              transform:hovered ? "translateX(5px)" : "translateX(0)",
              transition:"color 0.25s, transform 0.25s",
            }}
          >
            Open product <ArrowRight className="w-3 h-3" />
          </div>
        ) : (
          <div className="text-[11px]" style={{ color:"#1E2A38", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.04em" }}>
            join waitlist →
          </div>
        )}
      </div>
    </a>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ Icon, label, title, body, accent, n, borderRight }: {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; title: string; body: string; accent: string; n: string; borderRight: boolean;
}) {
  const [hov, setHov] = useState(false);
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setMx(((e.clientX - r.left) / r.width) * 100);
    setMy(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <div ref={ref}
      className="relative p-10 overflow-hidden cursor-default"
      style={{ borderRight:borderRight ? "1px solid rgba(0,229,255,0.045)" : "none" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={handleMove}
    >
      {hov && (
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position:"absolute", inset:0,
            background:`radial-gradient(400px circle at ${mx}% ${my}%, ${accent}0B 0%, transparent 70%)`,
          }} />
        </div>
      )}
      <div className="absolute top-2 right-4 pointer-events-none select-none"
        style={{
          fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:"110px",
          color:accent, opacity:hov ? 0.055 : 0.028, lineHeight:1,
          transition:"opacity 0.35s ease",
        }}
      >
        {n}
      </div>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{
          background:`linear-gradient(90deg,transparent,${accent}40,transparent)`,
          opacity:hov ? 1 : 0, transition:"opacity 0.3s ease",
        }}
      />
      <div className="relative z-10">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-7"
          style={{
            background:hov ? accent+"18" : accent+"0A",
            border:`1px solid ${hov ? accent+"44" : accent+"1A"}`,
            boxShadow:hov ? `0 0 24px ${accent}22` : "none",
            transform:hov ? "scale(1.07) rotate(-3deg)" : "none",
            transition:"all 0.4s cubic-bezier(0.34,1.4,0.64,1)",
          }}
        >
          <Icon className="w-5 h-5" style={{ color:accent }} />
        </div>
        <div className="text-[10px] mb-3" style={{ color:accent+"99", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.09em" }}>
          {label}
        </div>
        <h3 className="mb-3.5" style={{
          fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:600, fontSize:"22px",
          color:hov ? "#EDF2F7" : "#C8D6E2", lineHeight:1.1, transition:"color 0.25s ease",
        }}>
          {title}
        </h3>
        <p className="text-[13.5px]" style={{ color:"#2D3D50", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.78 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

// ─── Hero Visualization (with path draw-on) ───────────────────────────────────

function HeroVisualization() {
  const nodes = [
    { cx:108, cy:90,  color:"#3B82F6", label:"BLUEPRINT", anchor:"right" },
    { cx:432, cy:90,  color:"#10B981", label:"PULSE",     anchor:"left"  },
    { cx:108, cy:258, color:"#F59E0B", label:"ATLAS",     anchor:"right" },
    { cx:432, cy:258, color:"#EF4444", label:"SENTINEL",  anchor:"left"  },
    { cx:270, cy:305, color:"#8B5CF6", label:"FORGE",     anchor:"right" },
    { cx:172, cy:378, color:"#06B6D4", label:"RADAR",     anchor:"right" },
    { cx:368, cy:378, color:"#818CF8", label:"RELAY",     anchor:"left"  },
  ] as const;

  // Each path: d, color, length (pre-computed approximation), delay, dotDur, dotBegin, dotPath
  const paths = [
    { d:"M108,90 L270,174",        color:"#3B82F6", len:193, delay:0.1,  dotDur:"4.2s", dotBegin:"1.1s",  dotPath:"M108,90 L270,174" },
    { d:"M432,90 L270,174",        color:"#10B981", len:193, delay:0.4,  dotDur:"5s",   dotBegin:"1.5s",  dotPath:"M432,90 L270,174" },
    { d:"M270,174 L270,305",       color:"#8B5CF6", len:131, delay:0.7,  dotDur:"3.8s", dotBegin:"1.8s",  dotPath:"M270,174 L270,305" },
    { d:"M108,90 L108,258",        color:"#F59E0B", len:168, delay:0.3,  dotDur:"6s",   dotBegin:"2.2s",  dotPath:"M108,90 L108,258 L270,305" },
    { d:"M108,258 L270,305",       color:"#F59E0B", len:172, delay:0.55, dotDur:null,   dotBegin:null,    dotPath:null },
    { d:"M432,90 L432,258",        color:"#EF4444", len:168, delay:0.35, dotDur:"6.5s", dotBegin:"2.4s",  dotPath:"M432,90 L432,258 L270,305" },
    { d:"M432,258 L270,305",       color:"#EF4444", len:194, delay:0.6,  dotDur:null,   dotBegin:null,    dotPath:null },
    { d:"M108,258 L172,378",       color:"#06B6D4", len:139, delay:0.9,  dotDur:"5.4s", dotBegin:"2.0s",  dotPath:"M108,258 L172,378" },
    { d:"M432,258 L368,378",       color:"#818CF8", len:148, delay:1.1,  dotDur:"5.8s", dotBegin:"2.6s", dotPath:"M432,258 L368,378" },
  ];

  return (
    <div className="relative w-full min-h-[410px] overflow-hidden" style={{ borderRadius:18 }}>
      <div className="absolute inset-0"
        style={{
          backgroundImage:`linear-gradient(rgba(0,229,255,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.028) 1px,transparent 1px)`,
          backgroundSize:"36px 36px",
        }}
      />
      <div className="absolute inset-0"
        style={{ background:"radial-gradient(ellipse 55% 50% at 50% 44%, rgba(0,229,255,0.045) 0%, transparent 65%)" }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 540 420" fill="none" preserveAspectRatio="xMidYMid meet">
        <defs>
          <style>{`
            ${paths.map((p, i) => `
              .draw-path-${i} {
                stroke-dasharray: ${p.len};
                stroke-dashoffset: ${p.len};
                animation: drawPath 1.0s cubic-bezier(0.4,0,0.2,1) ${p.delay}s forwards;
              }
            `).join("")}
            @keyframes drawPath { to { stroke-dashoffset: 0; } }
          `}</style>
        </defs>

        <circle cx="270" cy="174" r="34" stroke="#00E5FF" strokeWidth="0.7" strokeOpacity="0.6"
          style={{ animation:"ringPulse 3.2s ease-out infinite", transformOrigin:"270px 174px" }} />
        <circle cx="270" cy="174" r="34" stroke="#00E5FF" strokeWidth="0.4" strokeOpacity="0.35"
          style={{ animation:"ringPulse 3.2s ease-out infinite 1.3s", transformOrigin:"270px 174px" }} />
        <circle cx="270" cy="174" r="55" stroke="#00E5FF" strokeWidth="0.3" strokeOpacity="0.08" strokeDasharray="5 12" />

        {/* Draw-on paths */}
        {paths.map((p, i) => (
          <path key={i} className={`draw-path-${i}`}
            d={p.d} stroke={p.color} strokeWidth={p.color === "#2D3748" ? "0.5" : "0.6"}
            strokeOpacity={p.color === "#2D3748" ? "0.18" : "0.22"} fill="none"
            strokeDasharray={`${p.color === "#2D3748" ? "3 7" : "4 10"}`}
          />
        ))}

        {/* Travelling dots */}
        {paths.filter(p => p.dotDur && p.dotPath).map((p, i) => (
          <circle key={`dot-${i}`} r={p.color === "#06B6D4" ? "2.2" : "2.8"} fill={p.color} fillOpacity="0.75">
            <animateMotion dur={p.dotDur!} repeatCount="indefinite" begin={p.dotBegin!} path={p.dotPath!} />
          </circle>
        ))}

        {/* Central node */}
        <circle cx="270" cy="174" r="24" fill="#00E5FF" fillOpacity="0.04" stroke="#00E5FF" strokeWidth="1.3" strokeOpacity="0.5" />
        <circle cx="270" cy="174" r="14" fill="none" stroke="#00E5FF" strokeWidth="0.6" strokeOpacity="0.18" />
        <circle cx="270" cy="174" r="5.5" fill="#00E5FF" style={{ animation:"nodeGlow 2.8s ease-in-out infinite", filter:"blur(0.5px)" }} />
        <text x="279" y="170" fill="#00E5FF" fontSize="6.5" fontFamily="var(--font-jetbrains-mono),monospace" fillOpacity="0.8">RÖNTGEN</text>

        {nodes.map(({ cx, cy, color, label, anchor }, i) => (
          <g key={label}>
            <circle cx={cx} cy={cy} r="10" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="1.1" strokeOpacity="0.6" />
            <circle cx={cx} cy={cy} r="3.5" fill={color} style={{ animation:`nodeGlow 3s ease-in-out infinite ${i*0.38}s` }} />
            <text
              x={anchor === "right" ? cx+15 : cx-15} y={cy-4}
              fill={color} fontSize="8" fontFamily="var(--font-jetbrains-mono),monospace" fillOpacity="0.7"
              textAnchor={anchor === "right" ? "start" : "end"}
            >{label}</text>
          </g>
        ))}
        <text x="270" y="406" fill="#1F2937" fontSize="7.5" fontFamily="var(--font-jetbrains-mono),monospace" fillOpacity="0.4" textAnchor="middle">+4 SOON</text>
      </svg>

      <div className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background:"linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.04) 8%, #00E5FF 50%, rgba(0,229,255,0.04) 92%, transparent 100%)",
          boxShadow:"0 0 20px 6px rgba(0,229,255,0.25), 0 0 60px 12px rgba(0,229,255,0.06)",
          animation:"xrayScan 3.8s ease-in-out infinite",
        }}
      />
      <div className="absolute left-0 right-0 h-28 pointer-events-none"
        style={{
          background:"linear-gradient(to bottom, rgba(0,229,255,0.012), transparent)",
          animation:"xrayScanWake 3.8s ease-in-out infinite",
        }}
      />
      {(["tl","tr","br","bl"] as const).map(c => (
        <div key={c} className="absolute w-[18px] h-[18px] pointer-events-none"
          style={{
            top:c.startsWith("t")?10:undefined, bottom:c.startsWith("b")?10:undefined,
            left:c.endsWith("l")?10:undefined, right:c.endsWith("r")?10:undefined,
            borderTop:c.startsWith("t")?"1.5px solid rgba(0,229,255,0.4)":undefined,
            borderBottom:c.startsWith("b")?"1.5px solid rgba(0,229,255,0.4)":undefined,
            borderLeft:c.endsWith("l")?"1.5px solid rgba(0,229,255,0.4)":undefined,
            borderRight:c.endsWith("r")?"1.5px solid rgba(0,229,255,0.4)":undefined,
          }}
        />
      ))}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#00E5FF", animation:"pulseGlow 2s ease-in-out infinite", boxShadow:"0 0 6px #00E5FF" }} />
        <span style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"9px", color:"rgba(0,229,255,0.38)", letterSpacing:"0.08em" }}>LIVE · SCANNING</span>
      </div>
    </div>
  );
}

// ─── Ticker ────────────────────────────────────────────────────────────────────

function Ticker() {
  const items = ["Blueprint","Pulse","Atlas","Sentinel","Forge","Radar","Relay","Orbit","Aegis","Echo","Arena"];
  const repeated = [...items,...items,...items];
  return (
    <div className="relative overflow-hidden py-[13px]"
      style={{ borderTop:"1px solid rgba(0,229,255,0.055)", borderBottom:"1px solid rgba(0,229,255,0.055)", background:"rgba(0,229,255,0.008)" }}
    >
      <div className="flex" style={{ animation:"marquee 32s linear infinite", whiteSpace:"nowrap", width:"max-content" }}>
        {repeated.map((name, i) => {
          const p = products.find(x => x.name === name);
          const live = p?.status === "v1";
          return (
            <span key={i} className="inline-flex items-center gap-2.5 px-7">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background:live ? (p?.color ?? "#374151") : "#1A2433", boxShadow:live ? `0 0 6px ${p?.color}99` : "none" }}
              />
              <span style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:600, fontSize:"12px", letterSpacing:"0.13em", color:live ? "#3D4D5C" : "#1A2433" }}>
                {name.toUpperCase()}
              </span>
            </span>
          );
        })}
      </div>
      <div className="absolute inset-y-0 left-0 w-32 pointer-events-none" style={{ background:"linear-gradient(to right, #07090F, transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-32 pointer-events-none" style={{ background:"linear-gradient(to left, #07090F, transparent)" }} />
    </div>
  );
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

function Terminal() {
  const [activeTab, setActiveTab] = useState<TerminalTab>("radar");
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = TERMINAL[activeTab];

  const switchTab = (tab: TerminalTab) => {
    setActiveTab(tab);
    setVisibleLines(0);
  };

  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    ids.push(setTimeout(() => setVisibleLines(0), 0));
    lines.forEach((_, i) => ids.push(setTimeout(() => setVisibleLines(i + 1), (i + 1) * 78)));
    return () => ids.forEach(clearTimeout);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineColor = (type: TerminalLine["type"]): string => {
    const map: Record<string, string> = {
      cmd:"#00E5FF", info:"#2D3D50", header:"#EDF2F7", divider:"#141E2C",
      field:"#6A7D8E", sub:"#2D3D50", step:"#B0C4D4", meta:"#0891B2",
      warn:"#D97706", ok:"#059669", critical:"#DC2626", blank:"transparent",
    };
    return map[type] ?? "#6A7D8E";
  };

  const tabs = [
    { key:"radar" as TerminalTab,    label:"radar",    sublabel:"rca",     color:"#06B6D4" },
    { key:"atlas" as TerminalTab,    label:"atlas",    sublabel:"explain", color:"#F59E0B" },
    { key:"sentinel" as TerminalTab, label:"sentinel", sublabel:"review",  color:"#EF4444" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        border:"1px solid rgba(0,229,255,0.07)",
        background:"linear-gradient(160deg, #050A12 0%, #040810 100%)",
        boxShadow:"0 0 0 1px rgba(0,229,255,0.03), 0 50px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(0,229,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-2.5"
        style={{ background:"rgba(3,6,12,0.95)", borderBottom:"1px solid rgba(255,255,255,0.025)" }}
      >
        <div className="flex items-center gap-1.5">
          {["#EF4444","#F59E0B","#10B981"].map(c => (
            <div key={c} className="w-[11px] h-[11px] rounded-full" style={{ background:c, opacity:0.6 }} />
          ))}
        </div>
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded"
          style={{ background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.08)" }}
        >
          <Activity className="w-2.5 h-2.5" style={{ color:"#00E5FF", opacity:0.7 }} />
          <span style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"9px", color:"rgba(0,229,255,0.5)", letterSpacing:"0.06em" }}>
            RÖNTGEN CLI · v1.4.2
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#10B981", boxShadow:"0 0 5px #10B981", animation:"pulseGlow 2s ease-in-out infinite" }} />
          <span style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"9px", color:"rgba(16,185,129,0.55)", letterSpacing:"0.04em" }}>CONNECTED</span>
        </div>
      </div>
      <div className="flex items-end gap-0 px-5"
        style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", background:"rgba(4,8,16,0.9)" }}
      >
        {tabs.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className="relative flex items-center gap-2 px-4 pt-3 pb-2.5"
            style={{
              fontFamily:"var(--font-jetbrains-mono),monospace", background:"transparent",
              borderBottom:activeTab === t.key ? `1.5px solid ${t.color}` : "1.5px solid transparent",
            }}
          >
            <span style={{ fontSize:"11px", color:activeTab === t.key ? t.color : "#1E2A38", transition:"color 0.2s" }}>
              {t.label}
            </span>
            <span style={{ fontSize:"10px", color:activeTab === t.key ? t.color+"66" : "#0F1A24", transition:"color 0.2s" }}>
              {t.sublabel}
            </span>
            {activeTab === t.key && (
              <span className="w-1.5 h-1.5 rounded-full ml-0.5"
                style={{ background:t.color, boxShadow:`0 0 8px ${t.color}`, animation:"pulseGlow 2s ease-in-out infinite" }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="p-6 min-h-[340px] relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.045) 2px,rgba(0,0,0,0.045) 4px)", zIndex:0 }}
        />
        <div className="relative z-10 space-y-0.5">
          {lines.slice(0, visibleLines).map((line, i) =>
            line.type === "blank"
              ? <div key={`${activeTab}-${i}`} className="h-2" />
              : (
                <div key={`${activeTab}-${i}`} className="flex items-start gap-3">
                  <span className="select-none flex-shrink-0"
                    style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"9.5px", color:"#111C28", lineHeight:"1.8", minWidth:"22px", textAlign:"right" }}
                  >
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"12.5px",
                    color:lineColor(line.type), lineHeight:1.8, whiteSpace:"pre",
                    fontWeight:line.type === "header" ? 600 : 400,
                    letterSpacing:line.type === "header" ? "0.1em" : "0",
                    textShadow:line.type === "critical" ? "0 0 12px rgba(220,38,38,0.4)" : line.type === "ok" ? "0 0 10px rgba(5,150,105,0.3)" : "none",
                  }}>
                    {line.text}
                  </span>
                </div>
              )
          )}
          {visibleLines < lines.length && (
            <div className="flex items-start gap-3">
              <span style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"9.5px", color:"#111C28", lineHeight:"1.8", minWidth:"22px", textAlign:"right" }}>
                {visibleLines + 1}
              </span>
              <span style={{ display:"inline-block", width:"8px", height:"14px", background:"#00E5FF", opacity:0.8, animation:"blink 1s step-end infinite", verticalAlign:"text-bottom" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children, accent = "#00E5FF" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded mb-5"
      style={{
        color:accent, background:accent+"07", border:`1px solid ${accent}16`,
        fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.09em",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background:accent, opacity:0.7 }} />
      {children}
    </div>
  );
}

// ─── Glow Divider ─────────────────────────────────────────────────────────────

function GlowDivider() {
  return (
    <div className="w-full h-px"
      style={{ background:"linear-gradient(90deg, transparent, rgba(0,229,255,0.22), rgba(0,229,255,0.44), rgba(0,229,255,0.22), transparent)" }}
    />
  );
}

// ─── Custom Cursor ────────────────────────────────────────────────────────────

function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -100, y: -100 });
  const ring    = useRef({ x: -100, y: -100 });
  const raf     = useRef(0);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);

  const move   = useCallback((e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; }, []);
  const down   = useCallback(() => setClicking(true), []);
  const up     = useCallback(() => setClicking(false), []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      move(e);
      const t = e.target as Element;
      setHovering(!!t.closest("a,button,input,[data-cursor='pointer']"));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);

    const tick = () => {
      const { x, y } = pos.current;
      if (dotRef.current) dotRef.current.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      ring.current.x += (x - ring.current.x) * 0.13;
      ring.current.y += (y - ring.current.y) * 0.13;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.current.x}px,${ring.current.y}px) translate(-50%,-50%)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      cancelAnimationFrame(raf.current);
    };
  }, [move, down, up]);

  const ringSize  = clicking ? 28 : hovering ? 44 : 36;
  const dotSize   = clicking ? 4  : hovering ? 6  : 5;
  const ringColor = hovering ? "rgba(0,229,255,0.7)" : "rgba(0,229,255,0.38)";
  const dotGlow   = hovering
    ? "0 0 14px 4px rgba(0,229,255,0.75), 0 0 32px 8px rgba(0,229,255,0.35)"
    : "0 0 8px 2px rgba(0,229,255,0.55)";

  return (
    <>
      <div ref={ringRef} className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width:ringSize, height:ringSize, borderRadius:"50%",
          border:`1px solid ${ringColor}`,
          transition:"width 0.22s cubic-bezier(0.34,1.4,0.64,1), height 0.22s cubic-bezier(0.34,1.4,0.64,1), border-color 0.2s ease",
          willChange:"transform",
          backdropFilter:hovering ? "blur(2px)" : "none",
        }}
      />
      <div ref={dotRef} className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width:dotSize, height:dotSize, borderRadius:"50%",
          background:hovering ? "#00E5FF" : "rgba(0,229,255,0.9)",
          boxShadow:dotGlow,
          transition:"width 0.15s ease, height 0.15s ease, box-shadow 0.2s ease, background 0.2s ease",
          willChange:"transform",
        }}
      />
    </>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [heroRef, heroVisible] = useFadeInUp(0.01);
  const [prodRef, prodVisible] = useFadeInUp(0.05);
  const [featRef, featVisible] = useFadeInUp(0.05);
  const [termRef, termVisible] = useFadeInUp(0.05);
  const [waitRef, waitVisible] = useFadeInUp(0.05);
  const liveProd = useCounter(7, 1500, heroVisible);
  const scrollProg = useScrollProgress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setWaitlistLoading(true);
    setWaitlistError("");
    try {
      await joinWaitlist(email.trim(), "general");
      setSubmitted(true);
      setEmail("");
    } catch (error) {
      setWaitlistError(
        error instanceof Error ? error.message : "Could not join the waitlist.",
      );
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes xrayScan      { 0%{top:-2px;opacity:0}6%{opacity:1}94%{opacity:1}100%{top:calc(100% + 2px);opacity:0} }
        @keyframes xrayScanWake  { 0%{top:-112px;opacity:0}6%{opacity:1}94%{opacity:1}100%{top:calc(100% + 2px);opacity:0} }
        @keyframes pulseGlow     { 0%,100%{opacity:0.45} 50%{opacity:1} }
        @keyframes nodeGlow      { 0%,100%{opacity:0.6;filter:blur(0.3px)} 50%{opacity:1;filter:blur(0.8px)} }
        @keyframes ringPulse     { 0%{transform:scale(1);opacity:0.65} 100%{transform:scale(3);opacity:0} }
        @keyframes floatY        { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes marquee       { 0%{transform:translateX(0)} 100%{transform:translateX(-33.333%)} }
        @keyframes blink         { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shimmerSlide  { from{transform:translateX(-100%)} to{transform:translateX(280%)} }
        @keyframes spin          { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes aurora1       { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)} 33%{transform:translate(-47%,-53%) scale(1.1) rotate(18deg)} 66%{transform:translate(-53%,-47%) scale(0.93) rotate(-12deg)} }
        @keyframes aurora2       { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-44%,-56%) scale(1.15)} }
        @keyframes aurora3       { 0%,100%{transform:translate(-50%,-50%) scale(1) rotate(0deg)} 50%{transform:translate(-52%,-48%) scale(1.12) rotate(28deg)} }
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        * { scrollbar-width:none; cursor:none !important; }
        *::-webkit-scrollbar { display:none; }
        ::selection { background:rgba(0,229,255,0.15); color:#F0F4F8; }
      `}</style>

      <ScrollProgressBar />
      <CustomCursor />

      <div className="min-h-screen" style={{ background:"#07090F", fontFamily:"var(--font-inter),sans-serif", color:"#F0F4F8" }}>

        {/* Grain */}
        <div className="fixed inset-0 pointer-events-none z-50"
          style={{
            backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat:"repeat", backgroundSize:"150px 150px",
            opacity:0.02, mixBlendMode:"overlay",
          }}
        />

        {/* ── NAV ────────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-14"
          style={{ height:58, background:"rgba(7,9,15,0.82)", backdropFilter:"blur(40px)", borderBottom:"1px solid rgba(0,229,255,0.045)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6 flex-shrink-0">
              <div className="absolute inset-0 rounded-md"
                style={{ background:"linear-gradient(135deg,rgba(0,229,255,0.18),rgba(0,229,255,0.03))", border:"1px solid rgba(0,229,255,0.28)" }}
              />
              <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full" fill="none">
                <circle cx="12" cy="12" r="4" stroke="#00E5FF" strokeWidth="1.4" />
                <line x1="12" y1="2" x2="12" y2="7" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
                <line x1="12" y1="17" x2="12" y2="22" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
                <line x1="2" y1="12" x2="7" y2="12" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
                <line x1="17" y1="12" x2="22" y2="12" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.45" />
                <circle cx="12" cy="12" r="1.5" fill="#00E5FF" />
              </svg>
            </div>
            <span style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:"16px", color:"#EDF2F7", letterSpacing:"0.08em" }}>
              RÖNTGEN<span style={{ color:"rgba(0,229,255,0.7)", fontWeight:400 }}> AI</span>
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-6">
            {["Blueprint","Pulse","Atlas","Sentinel","Forge","Radar","Relay"].map(p => (
              <a key={p} href={`/app/${p.toLowerCase()}`} className="text-[13px] transition-colors duration-180"
                style={{ color:"#2D3D50" }}
                onMouseEnter={e => (e.currentTarget.style.color="#8A9BB0")}
                onMouseLeave={e => (e.currentTarget.style.color="#2D3D50")}
              >{p}</a>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <a href="https://github.com" className="hidden sm:flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ color:"#3D4D5C", border:"1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(0,229,255,0.22)"; e.currentTarget.style.color="#7A8B9D"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.color="#3D4D5C"; }}
            >
              <GitHubMark className="w-3.5 h-3.5" /> GitHub
            </a>
            <MagneticButton href="/sign-up"
              className="text-[13px] px-4 py-1.5 rounded-lg font-semibold"
              style={{ background:"linear-gradient(135deg,#00E5FF 0%,#0099BB 100%)", color:"#07090F", boxShadow:"0 0 20px rgba(0,229,255,0.18)", display:"inline-block" }}
            >
              Get Started
            </MagneticButton>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center pt-[58px] overflow-hidden">
          <ParticleField />
          <Aurora intensity={1} scrollOffset={scrollProg * 3} />
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:`linear-gradient(rgba(0,229,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.016) 1px,transparent 1px)`,
              backgroundSize:"64px 64px",
            }}
          />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:"radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(7,9,15,0.7) 100%)" }}
          />

          <div ref={heroRef}
            className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-14 grid md:grid-cols-[1fr_1.05fr] gap-20 items-center py-28"
            style={{
              opacity:heroVisible ? 1 : 0,
              transform:heroVisible ? "translateY(0)" : "translateY(36px)",
              transition:"opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-10 text-[11px]"
                style={{
                  background:"rgba(0,229,255,0.04)", border:"1px solid rgba(0,229,255,0.14)",
                  color:"rgba(0,229,255,0.7)", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.05em",
                  backdropFilter:"blur(16px)", boxShadow:"0 0 30px rgba(0,229,255,0.06)",
                }}
              >
                <Sparkles className="w-3 h-3" style={{ color:"#00E5FF" }} />
                {liveProd} products live · rontgenai.dev
                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </div>

              <div style={{ marginBottom:28 }}>
                <div style={{
                  fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:300,
                  fontSize:"clamp(52px,7.5vw,96px)", color:"rgba(240,244,248,0.28)",
                  letterSpacing:"-0.02em", lineHeight:0.92,
                }}>
                  See through
                </div>
                <div style={{
                  fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700,
                  fontSize:"clamp(58px,8.5vw,108px)", letterSpacing:"-0.028em", lineHeight:0.9,
                  background:"linear-gradient(125deg, #E8EDF2 0%, #B0C8D8 22%, #00E5FF 48%, #0077AA 72%, #6366F1 100%)",
                  backgroundSize:"220% 220%",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                  animation:"gradientShift 9s ease infinite",
                }}>
                  your systems.
                </div>
              </div>

              <p style={{ color:"#3D4D5C", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.78, fontSize:17, maxWidth:390, marginBottom:36 }}>
                Multi-product AI suite for engineers. X-ray vision for architecture, code, data, and production reliability.
              </p>

              <div className="flex items-stretch rounded-2xl overflow-hidden"
                style={{
                  border:"1px solid rgba(255,255,255,0.05)",
                  background:"rgba(8,12,20,0.7)", backdropFilter:"blur(20px)",
                  maxWidth:340, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)", marginBottom:40,
                }}
              >
                {[
                  { n:liveProd.toString(), label:"Live products", accent:"#00E5FF" },
                  { n:"4",   label:"Coming soon",  accent:"#6366F1" },
                  { n:"<2s", label:"Analysis time", accent:"#10B981" },
                ].map(({ n, label, accent }, i) => (
                  <div key={label} className="flex-1 flex flex-col items-center justify-center py-5"
                    style={{ borderRight:i < 2 ? "1px solid rgba(255,255,255,0.045)" : "none" }}
                  >
                    <div style={{
                      fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:30,
                      color:accent, lineHeight:1, letterSpacing:"-0.02em",
                      textShadow:`0 0 30px ${accent}44`,
                    }}>
                      {n}
                    </div>
                    <div style={{ color:"#1E2A38", fontFamily:"var(--font-inter),sans-serif", fontSize:11, marginTop:6 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <MagneticButton href="#products"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold"
                  style={{
                    background:"linear-gradient(135deg,#00E5FF 0%,#008FAA 100%)", color:"#07090F",
                    fontFamily:"var(--font-inter),sans-serif", fontWeight:600,
                    boxShadow:"0 0 40px rgba(0,229,255,0.25), 0 8px 24px rgba(0,0,0,0.45)",
                    display:"inline-flex", alignItems:"center", gap:8,
                  }}
                >
                  Explore Products <ArrowRight className="w-4 h-4" />
                </MagneticButton>
                <Link href="/sign-in" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm transition-all duration-250"
                  style={{ border:"1px solid rgba(0,229,255,0.12)", color:"#3D4D5C", fontFamily:"var(--font-inter),sans-serif", backdropFilter:"blur(16px)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(0,229,255,0.35)"; e.currentTarget.style.color="#8A9BB0"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(0,229,255,0.12)"; e.currentTarget.style.color="#3D4D5C"; }}
                >
                  <ExternalLink className="w-4 h-4" /> Sign in
                </Link>
              </div>
            </div>

            <div className="hidden md:block" style={{ animation:"floatY 8s ease-in-out infinite" }}>
              <RotatingBorder radius={20} speed="10s" colors="#00E5FF18, #6366F108, #8B5CF608, #00E5FF18">
                <div style={{
                  background:"rgba(7,10,18,0.95)",
                  boxShadow:"0 0 80px rgba(0,229,255,0.06), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,229,255,0.05)",
                }}>
                  <HeroVisualization />
                </div>
              </RotatingBorder>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
            style={{ background:"linear-gradient(to bottom,transparent,#07090F)" }}
          />
        </section>

        <GlowDivider />
        <Ticker />
        <GlowDivider />

        {/* ── PRODUCTS ───────────────────────────────────────── */}
        <section id="products" className="py-32 px-6 md:px-14">
          <div ref={prodRef} className="max-w-7xl mx-auto"
            style={{
              opacity:prodVisible ? 1 : 0,
              transform:prodVisible ? "translateY(0)" : "translateY(30px)",
              transition:"opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6" style={{ marginBottom:64 }}>
              <div>
                <SectionLabel>01 — PRODUCT SUITE</SectionLabel>
                <RevealText visible={prodVisible} delay={120}
                  style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:"clamp(38px,5.5vw,66px)", color:"#EDF2F7", lineHeight:1.02, letterSpacing:"-0.018em", marginBottom:8 }}
                >
                  X-ray vision for every layer.
                </RevealText>
                <div style={{
                  fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700,
                  fontSize:"clamp(38px,5.5vw,66px)", lineHeight:1.02, letterSpacing:"-0.018em",
                  background:"linear-gradient(125deg,#00E5FF,#6366F1)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                }}>
                  <RevealText visible={prodVisible} delay={320}
                    style={{ fontFamily:"inherit", fontWeight:"inherit", fontSize:"inherit", letterSpacing:"inherit", lineHeight:"inherit" }}
                  >
                    of your stack.
                  </RevealText>
                </div>
              </div>
              <p style={{ color:"#2D3D50", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.8, fontSize:14, maxWidth:240, textAlign:"right" }}>
                Seven products live. Four more in the scanner. Each built around one insight: engineers need to see clearly, not guess.
              </p>
            </div>

            <div className="flex items-center gap-5" style={{ marginBottom:24 }}>
              <div className="h-px flex-1" style={{ background:"linear-gradient(to right,rgba(0,229,255,0.22),transparent)" }} />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#00E5FF", animation:"pulseGlow 2s ease-in-out infinite", boxShadow:"0 0 6px #00E5FF" }} />
                <span style={{ color:"#2D3D50", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.1em", fontSize:10 }}>LIVE NOW · v1</span>
              </div>
              <div className="h-px flex-1" style={{ background:"linear-gradient(to left,rgba(0,229,255,0.22),transparent)" }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginBottom:64 }}>
              {products.filter(p => p.status === "v1").map(p => <ProductCard key={p.id} product={p} />)}
            </div>

            <div className="flex items-center gap-5" style={{ marginBottom:24 }}>
              <div className="h-px flex-1" style={{ background:"linear-gradient(to right,rgba(255,255,255,0.04),transparent)" }} />
              <span style={{ color:"#1A2433", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.1em", fontSize:10 }}>COMING SOON · JOIN WAITLIST</span>
              <div className="h-px flex-1" style={{ background:"linear-gradient(to left,rgba(255,255,255,0.04),transparent)" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.filter(p => p.status === "coming-soon").map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────── */}
        <section className="py-24 px-6 md:px-14">
          <div ref={featRef} className="max-w-7xl mx-auto"
            style={{
              opacity:featVisible ? 1 : 0,
              transform:featVisible ? "translateY(0)" : "translateY(28px)",
              transition:"opacity 0.85s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
          >
            <SectionLabel>02 — WHY RÖNTGEN</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 rounded-2xl overflow-hidden"
              style={{ border:"1px solid rgba(0,229,255,0.06)", background:"rgba(9,13,21,0.6)", backdropFilter:"blur(20px)" }}
            >
              <FeatureCard
                Icon={Eye} label="DIAGNOSTIC CLARITY" title="Surface what others miss"
                body="Every product exposes what's hidden — architectural debt, silent bugs, incident root causes — before they cascade."
                accent="#00E5FF" n="01" borderRight={true}
              />
              <FeatureCard
                Icon={Cpu} label="ENGINEER-NATIVE" title="Built for the terminal generation"
                body="No dashboards for executives. Every product plugs into the workflows engineers already live in: GitHub, SQL, CLI, Slack."
                accent="#8B5CF6" n="02" borderRight={true}
              />
              <FeatureCard
                Icon={Zap} label="INSTANT INTELLIGENCE" title="Answers in seconds, not sprints"
                body="From architecture review to incident RCA, Röntgen returns analysis faster than your standup. Stop waiting for the post-mortem."
                accent="#F59E0B" n="03" borderRight={false}
              />
            </div>
          </div>
        </section>

        {/* ── TERMINAL ───────────────────────────────────────── */}
        <section className="py-20 px-6 md:px-14">
          <div ref={termRef} className="max-w-7xl mx-auto"
            style={{
              opacity:termVisible ? 1 : 0,
              transform:termVisible ? "translateY(0)" : "translateY(28px)",
              transition:"opacity 0.85s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.1s",
            }}
          >
            <div className="flex flex-col lg:flex-row gap-16 items-start">
              <div className="lg:w-[42%] flex-shrink-0 pt-1">
                <SectionLabel>03 — LIVE DEMO</SectionLabel>
                <RevealText visible={termVisible} delay={100}
                  style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:"clamp(34px,4.5vw,54px)", color:"#EDF2F7", lineHeight:1.05, letterSpacing:"-0.015em", marginBottom:4 }}
                >
                  See it work.
                </RevealText>
                <div style={{
                  fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700,
                  fontSize:"clamp(34px,4.5vw,54px)", lineHeight:1.05, letterSpacing:"-0.015em", marginBottom:20,
                  background:"linear-gradient(130deg,#00E5FF,#6366F1 60%,#8B5CF6)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                }}>
                  <RevealText visible={termVisible} delay={260}
                    style={{ fontFamily:"inherit", fontWeight:"inherit", fontSize:"inherit", letterSpacing:"inherit", lineHeight:"inherit" }}
                  >
                    In real output.
                  </RevealText>
                </div>
                <p style={{ color:"#2D3D50", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.82, fontSize:14, marginBottom:32 }}>
                  Every Röntgen product returns structured, actionable output — not walls of text. Switch between products to see exactly what engineers see.
                </p>
                <div className="space-y-1.5">
                  {[
                    { label:"Radar",    desc:"Production incident RCA", color:"#06B6D4" },
                    { label:"Atlas",    desc:"Repository analysis",     color:"#F59E0B" },
                    { label:"Sentinel", desc:"PR code review",          color:"#EF4444" },
                  ].map(({ label, desc, color }) => (
                    <div key={label} className="flex items-center gap-3 text-sm p-3 rounded-xl transition-all duration-200"
                      style={{ border:"1px solid transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=color+"22"; e.currentTarget.style.background=color+"07"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.background="transparent"; }}
                    >
                      <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color }} />
                      <span style={{ color:"#6A7D8E", fontWeight:500, fontFamily:"var(--font-inter),sans-serif" }}>{label}</span>
                      <span style={{ color:"#1A2433" }}>—</span>
                      <span style={{ color:"#1A2433", fontFamily:"var(--font-inter),sans-serif" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full"><Terminal /></div>
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS ───────────────────────────────────── */}
        <section className="py-12 px-6 md:px-14">
          <div className="max-w-7xl mx-auto">
            <p className="text-center" style={{ color:"#1A2433", fontFamily:"var(--font-jetbrains-mono),monospace", letterSpacing:"0.14em", fontSize:10, marginBottom:32 }}>
              WORKS WITH YOUR EXISTING STACK
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { name:"GitHub",     color:"#7A8B9D" },
                { name:"PostgreSQL", color:"#336791" },
                { name:"AWS",        color:"#FF9900" },
                { name:"Kubernetes", color:"#326CE5" },
                { name:"Datadog",    color:"#632CA6" },
                { name:"Slack",      color:"#4A154B" },
                { name:"Jira",       color:"#0052CC" },
                { name:"Kafka",      color:"#6B7280" },
                { name:"Grafana",    color:"#F46800" },
                { name:"PagerDuty",  color:"#06AC38" },
              ].map(({ name, color }) => (
                <div key={name}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] cursor-default transition-all duration-250"
                  style={{
                    background:"rgba(10,14,22,0.8)", border:"1px solid rgba(255,255,255,0.04)",
                    color:"#2D3D50", fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:600, letterSpacing:"0.08em",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor=color+"44";
                    e.currentTarget.style.color=color;
                    (e.currentTarget as HTMLElement).style.boxShadow=`0 0 18px ${color}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";
                    e.currentTarget.style.color="#2D3D50";
                    (e.currentTarget as HTMLElement).style.boxShadow="none";
                  }}
                >
                  {name.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </section>

        <GlowDivider />

        {/* ── WAITLIST ───────────────────────────────────────── */}
        <section id="waitlist" className="scroll-mt-20 py-32 px-6 md:px-14">
          <div ref={waitRef} className="max-w-7xl mx-auto"
            style={{
              opacity:waitVisible ? 1 : 0,
              transform:waitVisible ? "translateY(0)" : "translateY(28px)",
              transition:"opacity 0.85s cubic-bezier(0.22,1,0.36,1), transform 0.85s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <RotatingBorder radius={24} speed="12s" colors="#00E5FF20, #6366F110, #8B5CF610, #06B6D415, #00E5FF20">
              <div className="relative overflow-hidden" style={{ background:"rgba(8,12,20,0.96)", borderRadius:23 }}>
                <Aurora intensity={0.55} scrollOffset={scrollProg} />
                <div className="absolute inset-0"
                  style={{
                    backgroundImage:`linear-gradient(rgba(0,229,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.014) 1px,transparent 1px)`,
                    backgroundSize:"52px 52px",
                  }}
                />
                <div className="relative z-10 p-12 md:p-20 text-center">
                  <SectionLabel>04 — EARLY ACCESS</SectionLabel>

                  <RevealText visible={waitVisible} delay={120}
                    style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:"clamp(40px,5.5vw,70px)", color:"#EDF2F7", lineHeight:1.02, letterSpacing:"-0.018em", marginBottom:8 }}
                  >
                    Four more products
                  </RevealText>
                  <div style={{
                    fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700,
                    fontSize:"clamp(40px,5.5vw,70px)", lineHeight:1.02, letterSpacing:"-0.018em", marginBottom:24,
                    background:"linear-gradient(125deg,#00E5FF 0%,#6366F1 55%,#8B5CF6 100%)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                  }}>
                    <RevealText visible={waitVisible} delay={340}
                      style={{ fontFamily:"inherit", fontWeight:"inherit", fontSize:"inherit", letterSpacing:"inherit", lineHeight:"inherit" }}
                    >
                      in the scanner.
                    </RevealText>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3" style={{ marginBottom:40 }}>
                    {[
                      { name:"Orbit",  desc:"Job search copilot",       color:"#6366F1", Icon:CircleDot },
                      { name:"Aegis",  desc:"Customer support agent",   color:"#10B981", Icon:ShieldCheck },
                      { name:"Echo",   desc:"Meeting copilot",          color:"#F59E0B", Icon:Waves },
                      { name:"Arena",  desc:"Interview coach",          color:"#EF4444", Icon:Target },
                    ].map(({ name, desc, color, Icon: I }) => (
                      <div key={name}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-default transition-all duration-250"
                        style={{ background:"rgba(7,9,15,0.8)", border:"1px solid rgba(255,255,255,0.05)", backdropFilter:"blur(16px)" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=color+"40"; (e.currentTarget as HTMLElement).style.boxShadow=`0 0 25px ${color}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}
                      >
                        <I className="w-4 h-4" style={{ color, opacity:0.6 }} />
                        <div className="text-left">
                          <div style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:600, fontSize:14, color:"#4A5A6A", letterSpacing:"0.02em" }}>{name}</div>
                          <div style={{ color:"#1A2433", fontFamily:"var(--font-inter),sans-serif", fontSize:11 }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ color:"#2D3D50", fontFamily:"var(--font-inter),sans-serif", lineHeight:1.8, fontSize:15, maxWidth:280, margin:"0 auto 40px" }}>
                    Get early access before public launch. One email when it ships.
                  </p>

                  {submitted ? (
                    <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl"
                      style={{ background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.2)", backdropFilter:"blur(20px)", boxShadow:"0 0 40px rgba(0,229,255,0.08)" }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background:"#00E5FF", animation:"pulseGlow 2s ease-in-out infinite", boxShadow:"0 0 12px #00E5FF" }} />
                      <span style={{ color:"#00E5FF", fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:13, letterSpacing:"0.02em" }}>
                        {"You're on the list. We'll reach out soon."}
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                      <input type="email" placeholder="engineer@company.com"
                        value={email} onChange={e => { setEmail(e.target.value); setWaitlistError(""); }} required
                        disabled={waitlistLoading}
                        className="flex-1 px-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{ background:"rgba(7,9,15,0.95)", border:"1px solid rgba(255,255,255,0.06)", color:"#EDF2F7", fontFamily:"var(--font-inter),sans-serif", backdropFilter:"blur(20px)" }}
                        onFocus={e => (e.currentTarget.style.borderColor="rgba(0,229,255,0.3)")}
                        onBlur={e => (e.currentTarget.style.borderColor="rgba(255,255,255,0.06)")}
                      />
                      <MagneticButton type="submit"
                        className="px-6 py-3.5 rounded-xl text-sm font-semibold whitespace-nowrap"
                        style={{
                          background:"linear-gradient(135deg,#00E5FF,#0099BB)", color:"#07090F",
                          fontFamily:"var(--font-inter),sans-serif", fontWeight:600, boxShadow:"0 0 32px rgba(0,229,255,0.28)",
                          display:"inline-block",
                        }}
                      >
                        {waitlistLoading ? "Joining…" : "Join Waitlist"}
                      </MagneticButton>
                    </form>
                  )}
                  {waitlistError ? (
                    <p className="mt-3 text-sm" style={{ color:"#EF4444", fontFamily:"var(--font-inter),sans-serif" }}>
                      {waitlistError}
                    </p>
                  ) : null}
                </div>
              </div>
            </RotatingBorder>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="px-6 md:px-14 py-10" style={{ borderTop:"1px solid rgba(0,229,255,0.04)" }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-7">
            <div>
              <div style={{ fontFamily:"var(--font-rajdhani),sans-serif", fontWeight:700, fontSize:14, color:"#8A9BB0", letterSpacing:"0.08em", marginBottom:3 }}>
                RÖNTGEN AI
              </div>
              <p style={{ color:"#111C28", fontFamily:"var(--font-inter),sans-serif", fontSize:12 }}>See through your systems.</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {products.map(p => (
                <a key={p.id} href={p.status === "v1" ? `/app/${p.id}` : "#waitlist"} className="text-[11px] transition-colors duration-150"
                  style={{ color:"#111C28", fontFamily:"var(--font-inter),sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color="#2D3D50")}
                  onMouseLeave={e => (e.currentTarget.style.color="#111C28")}
                >
                  {p.name}
                </a>
              ))}
              <Link href="/app/billing" className="text-[11px] transition-colors duration-150" style={{ color:"#111C28", fontFamily:"var(--font-inter),sans-serif" }}>Pricing</Link>
              <Link href="/privacy" className="text-[11px] transition-colors duration-150" style={{ color:"#111C28", fontFamily:"var(--font-inter),sans-serif" }}>Privacy</Link>
              <Link href="/terms" className="text-[11px] transition-colors duration-150" style={{ color:"#111C28", fontFamily:"var(--font-inter),sans-serif" }}>Terms</Link>
            </div>
            <div className="flex items-center gap-5">
              <a href="https://github.com" style={{ color:"#111C28", transition:"color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color="#2D3D50")}
                onMouseLeave={e => (e.currentTarget.style.color="#111C28")}
              >
                <GitHubMark className="w-4 h-4" />
              </a>
              <span style={{ color:"#0D1820", fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:10 }}>© 2024 RÖNTGEN AI</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
