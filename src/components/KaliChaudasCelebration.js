"use client";

import React, { useState, useEffect, useRef } from "react";

export default function KaliChaudasCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Check if already viewed in this session
    const hasSeen = sessionStorage.getItem("kali_chaudas_wished_2026");
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsFadingOut(true);
    sessionStorage.setItem("kali_chaudas_wished_2026", "true");
    setTimeout(() => {
      setIsVisible(false);
    }, 600);
  };

  // Red & Gold Sparkles Canvas Engine
  useEffect(() => {
    if (!isVisible || isFadingOut) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3.5 + 1.2;
        this.vx = (Math.random() - 0.5) * 9;
        this.vy = (Math.random() - 0.5) * 9 - 2;
        this.gravity = 0.12;
        this.alpha = 1;
        this.decay = Math.random() * 0.016 + 0.008;
      }
      update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    const colors = ["#f43f5e", "#fb7185", "#e11d48", "#ffd700", "#22c55e", "#ffffff"];

    const burst = (x, y) => {
      for (let i = 0; i < 45; i++) {
        particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
      }
    };

    // Initial bursts
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        burst(window.innerWidth * (0.18 + i * 0.22), window.innerHeight * (0.2 + Math.random() * 0.25));
      }, i * 180);
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(index, 1);
      });

      if (Math.random() < 0.1) {
        burst(
          Math.random() * canvas.width * 0.85 + canvas.width * 0.075,
          Math.random() * canvas.height * 0.5 + 50
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, isFadingOut]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        .kali-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(38, 10, 26, 0.9) 0%, rgba(7, 5, 12, 0.98) 100%);
          backdrop-filter: blur(10px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .kali-overlay.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .kali-card-box {
          position: relative;
          z-index: 10;
          width: 530px;
          max-width: 90vw;
          background: linear-gradient(155deg, rgba(30, 13, 24, 0.98) 0%, rgba(13, 8, 16, 0.99) 100%);
          border: 2px solid #f43f5e;
          border-radius: 32px;
          padding: 2.2rem 2.2rem 2.4rem;
          text-align: center;
          box-shadow: 0 0 90px rgba(225, 29, 72, 0.5), inset 0 0 35px rgba(244, 63, 94, 0.25);
          animation: popEntrance 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes popEntrance {
          0% { opacity: 0; transform: scale(0.65) translateY(45px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .limbu-mirchi-centerpiece {
          margin: 0.5rem auto 1.4rem;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          padding: 1.25rem 2rem 1rem;
          background: radial-gradient(circle, rgba(244, 63, 94, 0.18) 0%, rgba(0, 0, 0, 0.4) 80%);
          border: 1px solid rgba(244, 63, 94, 0.35);
          border-radius: 24px;
          box-shadow: 0 0 35px rgba(244, 63, 94, 0.3);
          animation: gentleSwing 4s infinite alternate ease-in-out;
          transform-origin: top center;
        }

        @keyframes gentleSwing {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }

        .black-string {
          width: 3px;
          height: 32px;
          background: #0f172a;
          box-shadow: 0 0 6px #000;
        }

        .chilli-row {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          margin-top: -6px;
        }

        .chilli-art {
          width: 22px;
          height: 64px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.7));
        }

        .big-lemon {
          width: 58px;
          height: 58px;
          background: radial-gradient(circle at 35% 30%, #fffb8f 0%, #facc15 50%, #b45309 100%);
          border-radius: 50%;
          border: 3px solid #fef08a;
          box-shadow: 0 0 25px rgba(250, 204, 21, 0.8), inset -2px -4px 10px rgba(0,0,0,0.3);
          margin-top: -12px;
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .big-lemon .tip {
          width: 6px;
          height: 6px;
          background: #78350f;
          border-radius: 50%;
        }

        .coal-bead {
          width: 18px;
          height: 18px;
          background: radial-gradient(circle at 30% 30%, #475569, #020617);
          border-radius: 50%;
          border: 1.5px solid #64748b;
          margin-top: 4px;
          box-shadow: 0 0 10px #000;
        }

        .shield-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(244, 63, 94, 0.2);
          border: 1px solid rgba(244, 63, 94, 0.5);
          color: #fb7185;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 20px;
          margin-bottom: 0.9rem;
        }

        .btn-enter-dash-kali {
          background: linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.25);
          font-weight: 800;
          font-size: 0.95rem;
          padding: 14px 42px;
          border-radius: 30px;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(225, 29, 72, 0.55);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
        }
        .btn-enter-dash-kali:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 35px rgba(225, 29, 72, 0.75);
        }
      `}</style>

      <div className={`kali-overlay ${isFadingOut ? "fade-out" : ""}`}>
        {/* Fullscreen Canvas for Fireworks */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
        />

        {/* Festive Modal Card */}
        <div className="kali-card-box">
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "20px",
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.25rem",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            ✕
          </button>

          {/* REALISTIC HANGING LIMBU MIRCHI */}
          <div className="limbu-mirchi-centerpiece">
            <div className="black-string"></div>
            <div className="chilli-row">
              <svg class="chilli-art" style={{ transform: "rotate(-30deg) translate(8px, 4px)" }} viewBox="0 0 24 60" fill="none">
                <path d="M12 2 Q14 20 17 45 Q18 58 11 60 Q7 58 8 45 Q10 20 12 2Z" fill="#16a34a"/>
                <path d="M12 0 L12 4" stroke="#365314" strokeWidth="2.5"/>
              </svg>
              <svg class="chilli-art" style={{ transform: "rotate(-15deg) translate(4px, 2px)" }} viewBox="0 0 24 60" fill="none">
                <path d="M12 2 Q15 20 18 45 Q19 58 12 60 Q7 58 7 45 Q9 20 12 2Z" fill="#22c55e"/>
                <path d="M12 0 L12 4" stroke="#365314" strokeWidth="2.5"/>
              </svg>
              <svg class="chilli-art" style={{ zIndex: 3 }} viewBox="0 0 24 60" fill="none">
                <path d="M12 2 Q15 22 16 46 Q16 59 12 60 Q8 59 8 46 Q9 22 12 2Z" fill="#15803d"/>
                <path d="M12 0 L12 4" stroke="#365314" strokeWidth="2.5"/>
              </svg>
              <svg class="chilli-art" style={{ transform: "rotate(15deg) translate(-4px, 2px)" }} viewBox="0 0 24 60" fill="none">
                <path d="M12 2 Q9 20 6 45 Q5 58 12 60 Q17 58 17 45 Q15 20 12 2Z" fill="#22c55e"/>
                <path d="M12 0 L12 4" stroke="#365314" strokeWidth="2.5"/>
              </svg>
              <svg class="chilli-art" style={{ transform: "rotate(30deg) translate(-8px, 4px)" }} viewBox="0 0 24 60" fill="none">
                <path d="M12 2 Q10 20 8 45 Q7 58 13 60 Q17 58 16 45 Q14 20 12 2Z" fill="#16a34a"/>
                <path d="M12 0 L12 4" stroke="#365314" strokeWidth="2.5"/>
              </svg>
            </div>

            <div className="big-lemon">
              <div className="tip"></div>
            </div>

            <div className="coal-bead"></div>
          </div>

          <div className="shield-badge">
            <span>🌶️🍋</span> BURII NAZAR SE SURAKSHA SHIELD ON
          </div>

          <div style={{ color: "#ffd700", fontSize: "0.85rem", letterSpacing: "0.26em", textTransform: "uppercase", fontWeight: 800, marginBottom: "0.35rem" }}>
            ✨ SHUBH KALI CHAUDAS ✨
          </div>

          <h1 style={{
            fontSize: "2.4rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #ffffff 10%, #ffe4e6 45%, #f43f5e 80%, #ffd700 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
            marginBottom: "0.85rem"
          }}>
            Victory Over Negativity!
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.4rem" }}>
            May the supreme divine energy of Kali Chaudas ward off all negative vibes, obstacles, and evil eyes from Mooncliq Orbit and your entire team!
          </p>

          <div style={{ fontStyle: "italic", color: "#fbcfe8", fontSize: "0.85rem", marginBottom: "1.8rem" }}>
            "Koshish aur Mehnat par Maa Mahakali ka aashirwaad bana rahe — Har Deal Vijayee bane!"
          </div>

          <button className="btn-enter-dash-kali" onClick={handleClose}>
            Enter Shielded Dashboard 🛡️✨
          </button>
        </div>
      </div>
    </>
  );
}

