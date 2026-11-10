"use client";

import React, { useState, useEffect } from "react";

export default function SaalMubarakCelebration() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Session storage check so it only shows once per browser session
    const hasSeen = sessionStorage.getItem("mooncliq_saal_mubarak_seen");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("mooncliq_saal_mubarak_seen", "true");
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        padding: "1rem",
        animation: "fadeInModal 0.35s ease-out"
      }}
    >
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popCard {
          0% { transform: scale(0.92) translateY(12px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes floatDiya {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes flameFlicker {
          0% { transform: scale(1) rotate(-1deg); }
          100% { transform: scale(1.08) rotate(1.5deg); }
        }
      `}</style>

      {/* Main Festive Card (Warm Gold & Royal Ivory) */}
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "linear-gradient(135deg, #fffbf0 0%, #fff7ed 50%, #fef3c7 100%)",
          border: "1.5px solid #fde68a",
          borderRadius: "28px",
          padding: "2.75rem 2.25rem 2.25rem 2.25rem",
          textAlign: "center",
          boxShadow: "0 25px 60px -15px rgba(245, 158, 11, 0.35), 0 0 0 1px rgba(253, 230, 138, 0.5)",
          position: "relative",
          overflow: "hidden",
          animation: "popCard 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Golden & Festive Toran Accent at Top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 16px, #ef4444 16px, #ef4444 32px, #10b981 32px, #10b981 48px)",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
          }}
        />

        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.05)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#64748b",
            fontSize: "15px",
            fontWeight: "700",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
            e.currentTarget.style.color = "#0f172a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
            e.currentTarget.style.color = "#64748b";
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Traditional Floral Corner Motifs */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "80px", opacity: 0.16, pointerEvents: "none" }}
          viewBox="0 0 100 100"
        >
          <path d="M0,0 Q50,0 50,50 Q0,50 0,0 Z" fill="#f59e0b" />
          <circle cx="25" cy="25" r="8" fill="#d97706" />
        </svg>
        <svg
          style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", opacity: 0.16, pointerEvents: "none", transform: "scaleX(-1)" }}
          viewBox="0 0 100 100"
        >
          <path d="M0,0 Q50,0 50,50 Q0,50 0,0 Z" fill="#f59e0b" />
          <circle cx="25" cy="25" r="8" fill="#d97706" />
        </svg>

        {/* Floating Animated Diya Badge */}
        <div
          style={{
            width: "68px",
            height: "68px",
            margin: "0 auto 1.25rem auto",
            background: "linear-gradient(135deg, #fef3c7, #fde047)",
            border: "2px solid #fbbf24",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px rgba(245, 158, 11, 0.35), 0 0 30px rgba(251, 191, 36, 0.35)",
            animation: "floatDiya 3s ease-in-out infinite"
          }}
        >
          <svg
            style={{
              width: "36px",
              height: "36px",
              filter: "drop-shadow(0 0 6px #f59e0b)",
              animation: "flameFlicker 1.8s ease-in-out infinite alternate"
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            {/* Flame Glow */}
            <path d="M12 2C10.5 4.5 9 7.5 9 9.5C9 11.4 10.3 13 12 13C13.7 13 15 11.4 15 9.5C15 7.5 13.5 4.5 12 2Z" fill="#f59e0b" />
            <path d="M12 4C11 5.8 10 7.8 10 9.2C10 10.4 10.9 11.5 12 11.5C13.1 11.5 14 10.4 14 9.2C14 7.8 13 5.8 12 4Z" fill="#fef08a" />
            {/* Diya Base */}
            <path d="M4 14C4.5 18 8 21 12 21C16 21 19.5 18 20 14H4Z" fill="#b45309" />
            <path d="M3 13.5C5 15 8 16 12 16C16 16 19 15 21 13.5C21 13.5 18 12.5 12 12.5C6 12.5 3 13.5 3 13.5Z" fill="#d97706" />
          </svg>
        </div>

        {/* Samvat Pill Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 14px",
            borderRadius: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: "12.5px",
            fontWeight: "700",
            letterSpacing: "0.04em",
            marginBottom: "0.85rem"
          }}
        >
          <span>✨ વિક્રમ સંવત ૨૦૮૧ ✨</span>
        </div>

        {/* Main Headings in Gujarati */}
        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: "2.35rem",
            fontWeight: "800",
            lineHeight: "1.25",
            background: "linear-gradient(135deg, #b45309 0%, #d97706 40%, #dc2626 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.01em"
          }}
        >
          સાલ મુબારક
        </h1>
        <h2
          style={{
            margin: "0 0 1.25rem 0",
            fontSize: "1.4rem",
            fontWeight: "700",
            color: "#92400e"
          }}
        >
          નૂતન વર્ષાભિનંદન!
        </h2>

        {/* Diya Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            margin: "1rem 0"
          }}
        >
          <div style={{ height: "1px", width: "60px", background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }} />
          <span style={{ fontSize: "15px" }}>🪔 🌸 🪔</span>
          <div style={{ height: "1px", width: "60px", background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }} />
        </div>

        {/* Gujarati Blessings Box */}
        <div
          style={{
            fontSize: "1rem",
            lineHeight: "1.7",
            color: "#475569",
            fontWeight: "600",
            maxWidth: "460px",
            margin: "0 auto 1.75rem auto",
            background: "rgba(255, 255, 255, 0.75)",
            padding: "0.95rem 1.25rem",
            borderRadius: "16px",
            border: "1px dashed #fcd34d"
          }}
        >
          આ નવું વર્ષ તમારા અને તમારા પરિવારના જીવનમાં સુખ, શાંતિ, સમૃદ્ધિ, ઉત્તમ સ્વાસ્થ્ય અને અપાર સફળતા લઈને આવે એવી હૃદયપૂર્વકની શુભકામનાઓ!
          <span
            style={{
              display: "block",
              color: "#b45309",
              fontSize: "0.92rem",
              fontWeight: "700",
              marginTop: "8px"
            }}
          >
            🌸 તમારું નવું વર્ષ મંગલમય અને આનંદમય રહે! 🌸
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleClose}
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#ffffff",
            border: "none",
            padding: "11px 32px",
            fontSize: "14.5px",
            fontWeight: "700",
            borderRadius: "30px",
            cursor: "pointer",
            boxShadow: "0 10px 20px -3px rgba(217, 119, 6, 0.4)",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 14px 24px -3px rgba(217, 119, 6, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 20px -3px rgba(217, 119, 6, 0.4)";
          }}
        >
          <span>જય શ્રી કૃષ્ણ • Continue to Dashboard</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <p style={{ margin: "14px 0 0 0", fontSize: "11.5px", color: "#94a3b8", fontWeight: "600" }}>
          Mooncliq Orbit તરફથી આપ સૌને નવા વર્ષની હાર્દિક શુભેચ્છાઓ
        </p>
      </div>
    </div>
  );
}
