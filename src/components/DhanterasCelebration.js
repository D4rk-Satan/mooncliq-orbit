"use client";

import React, { useState, useEffect, useRef } from "react";

export default function DhanterasCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const canvasRef = useRef(null);
  const coinsContainerRef = useRef(null);

  useEffect(() => {
    // Check if already viewed in this session
    const hasSeen = sessionStorage.getItem("dhanteras_wished_2026");
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsFadingOut(true);
    sessionStorage.setItem("dhanteras_wished_2026", "true");
    setTimeout(() => {
      setIsVisible(false);
    }, 600);
  };

  // Fireworks & Sparkles Engine
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
        this.radius = Math.random() * 3.5 + 1.5;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10 - 2.5;
        this.gravity = 0.14;
        this.alpha = 1;
        this.decay = Math.random() * 0.018 + 0.008;
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
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    const colors = ["#ffd700", "#ffb703", "#ffffff", "#f59e0b", "#fef08a", "#d8f95c"];

    const burst = (x, y) => {
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
      }
    };

    // Initial festive burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        burst(window.innerWidth * (0.15 + i * 0.18), window.innerHeight * (0.2 + Math.random() * 0.3));
      }, i * 180);
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(index, 1);
      });

      // Continuous rich golden fireworks
      if (Math.random() < 0.12) {
        burst(
          Math.random() * canvas.width * 0.85 + canvas.width * 0.075,
          Math.random() * canvas.height * 0.5 + 60
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Dense Falling Gold Coins Shower
    const coinInterval = setInterval(() => {
      if (!coinsContainerRef.current) return;
      const coin = document.createElement("div");
      coin.className = "dhanteras-gold-coin";
      coin.style.left = Math.random() * 96 + "vw";
      coin.style.animationDuration = Math.random() * 2 + 2.2 + "s";
      coinsContainerRef.current.appendChild(coin);

      setTimeout(() => {
        coin.remove();
      }, 4200);
    }, 110);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      clearInterval(coinInterval);
    };
  }, [isVisible, isFadingOut]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        .dhanteras-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(30, 20, 8, 0.88) 0%, rgba(10, 8, 4, 0.96) 100%);
          backdrop-filter: blur(10px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .dhanteras-overlay.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .dhanteras-gold-coin {
          position: absolute;
          width: 26px;
          height: 26px;
          background: radial-gradient(circle, #fff9a6 20%, #ffd700 65%, #b8860b 100%);
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 14px rgba(255, 215, 0, 0.9), inset 0 0 6px rgba(0,0,0,0.3);
          pointer-events: none;
          z-index: 1;
          animation: coinFall linear forwards;
        }

        @keyframes coinFall {
          0% {
            transform: translateY(-50px) rotateY(0deg) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotateY(1080deg) rotateZ(540deg);
            opacity: 0.2;
          }
        }

        .dhanteras-modal-card {
          position: relative;
          z-index: 10;
          width: 530px;
          max-width: 90vw;
          background: linear-gradient(150deg, rgba(36, 26, 11, 0.97) 0%, rgba(18, 13, 6, 0.99) 100%);
          border: 2px solid #ffd700;
          border-radius: 32px;
          padding: 3.2rem 2.2rem 2.4rem;
          text-align: center;
          box-shadow: 0 0 90px rgba(255, 215, 0, 0.4), inset 0 0 35px rgba(255, 215, 0, 0.15);
          animation: popEntrance 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes popEntrance {
          0% { opacity: 0; transform: scale(0.65) translateY(50px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .diya-orb {
          width: 105px;
          height: 105px;
          margin: -75px auto 1.4rem;
          background: radial-gradient(circle, #fff3a8 0%, #ffd700 50%, #d4af37 80%, #785002 100%);
          border-radius: 50%;
          border: 4px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 50px rgba(255, 215, 0, 0.85);
          animation: glowPulse 2.2s infinite alternate ease-in-out;
        }

        @keyframes glowPulse {
          0% { transform: scale(1); box-shadow: 0 0 35px rgba(255, 215, 0, 0.7); }
          100% { transform: scale(1.08); box-shadow: 0 0 70px rgba(255, 215, 0, 1); }
        }

        .btn-enter-dash {
          background: linear-gradient(135deg, #ffd700 0%, #f59e0b 60%, #d97706 100%);
          color: #0f172a;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.02em;
          border: none;
          padding: 14px 42px;
          border-radius: 30px;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.55);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-enter-dash:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 35px rgba(245, 158, 11, 0.75);
        }
      `}</style>

      <div className={`dhanteras-overlay ${isFadingOut ? "fade-out" : ""}`}>
        {/* Fullscreen Fireworks Canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
        />

        {/* Falling Gold Coins Container */}
        <div ref={coinsContainerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }} />

        {/* Festive Modal Card */}
        <div className="dhanteras-modal-card">
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

          <div className="diya-orb">
            <span style={{ fontSize: "52px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>🪔</span>
          </div>

          <div style={{ color: "#ffd700", fontSize: "0.85rem", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 800, marginBottom: "0.4rem" }}>
            ✨ SHUBH DHANTERAS ✨
          </div>

          <h1 style={{
            fontSize: "2.6rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #ffffff 10%, #ffeaa7 50%, #f59e0b 95%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
            marginBottom: "1rem"
          }}>
            Happy Dhanteras!
          </h1>

          <p style={{ color: "#e2e8f0", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.6rem" }}>
            May the divine blessings of Goddess Lakshmi fill Mooncliq Orbit with endless growth, golden prosperity, and triumph in every deal!
          </p>

          <div style={{ fontStyle: "italic", color: "#fbbf24", fontSize: "0.85rem", marginBottom: "2rem" }}>
            "Dhan, Dhanya aur Safalta ka aashirwaad sada bana rahe!"
          </div>

          <button className="btn-enter-dash" onClick={handleClose}>
            Enter Dashboard ✨
          </button>
        </div>
      </div>
    </>
  );
}

