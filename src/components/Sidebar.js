"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import * as LucideIcons from 'lucide-react';
import { hasPermission } from "../lib/permissions";
import { useBootstrap } from "../contexts/AppBootstrapContext";

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen, refreshKey }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openCategory, setOpenCategory] = useState("SALES & CRM");
  // Active route par aate hi uska category automatically open rahe
  React.useEffect(() => {
    if (pathname.startsWith('/lead') || pathname.startsWith('/deal') || pathname.startsWith('/account') || pathname.startsWith('/products')) {
      setOpenCategory("SALES & CRM");
    } else if (pathname.startsWith('/task') || pathname.startsWith('/project')) {
      setOpenCategory("WORK");
    } else if (pathname.startsWith('/whatsapp') || pathname.startsWith('/campaigns') || pathname.startsWith('/dial-pad')) {
      setOpenCategory("COMMUNICATION");
    } else if (pathname.startsWith('/custom-module')) {
      setOpenCategory("CUSTOM MODULES");
    }
  }, [pathname]);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Instant data from Bootstrap cache / provider
  const { userInfo, customModules, refreshBootstrap } = useBootstrap();

  const DynamicLucideIcon = ({ name }) => {
    // Agar database me icon name nahi hai ya galat hai, toh default 'Box' dikhao
    const IconComponent = LucideIcons[name] || LucideIcons.Box;
    return <IconComponent size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />;
  };

  React.useEffect(() => {
    if (refreshKey) {
      refreshBootstrap();
    }
  }, [refreshKey, refreshBootstrap]);

  React.useEffect(() => {
    const saved = localStorage.getItem('mooncliq_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('mooncliq_sidebar_collapsed', newState.toString());
  };

  const handleSignOut = async () => {
    try {

      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const categories = [
    {
      name: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg> }
      ]
    },
    {
      name: "SALES & CRM",
      items: [
        { name: "Lead", href: "/lead", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
        { name: "Deal", href: "/deal", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg> },
        { name: "Account", href: "/account", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
        { name: "Products", href: "/products", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> }
      ]
    },
    {
      name: "WORK",
      items: [
        { name: "Task", href: "/task", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> },
        { name: "Project", href: "/project", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> }
      ]
    },
    {
      name: "COMMUNICATION",
      items: [
        { name: "Whatsapp", href: "/whatsapp", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> },
        { name: "Campaigns", href: "/campaigns", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> },
        { name: "Dial Pad", href: "/dial-pad", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> }
      ]
    }
  ];


  return (
    <>
      <style jsx global>{`
        .mini-group-wrapper:hover .mini-flyout-menu {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
               .mini-group-wrapper::after {
          content: '';
          position: absolute;
          right: -15px;
          top: 0;
          bottom: 0;
          width: 20px;
        }

        /* 🚀 BUTTERY SMOOTH CSS GRID ACCORDION (Zero Jumps, Zero Lag) */
        .accordion-collapse {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .accordion-collapse.open {
          grid-template-rows: 1fr;
        }
        .accordion-inner {
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .category-chevron {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
      `}</style>


      {/* Mobile Backdrop (Dark background) */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
        ></div>
      )}
      <aside
        className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: isCollapsed ? '72px' : '220px',
          transition: isMounted ? 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          overflow: 'visible',
          flexShrink: 0,
          position: 'relative'
        }}
      >
        <div
          className="sidebar-logo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0.85rem 0' : '0.85rem 1rem',
            position: 'relative',
            height: '56px',
            boxSizing: 'border-box'
          }}
        >
          {/* Logo & Text Container */}
          {isCollapsed ? (
            /* Collapsed Mode: Exact 40px square, identical to the nav icon buttons below */
            <div
              onClick={toggleSidebar}
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Click to expand sidebar"
            >
              <img
                src="/mooncliq-puzzle-only.png"
                alt="moonCliq"
                style={{
                  height: '32px',
                  width: '32px',
                  objectFit: 'contain',
                  transform: 'translateX(2px)' /* Visual balance with the top-right puzzle tab */
                }}
              />
            </div>
          ) : (
            /* Expanded Mode: Full Logo + Text */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                minWidth: 0,
                userSelect: 'none'
              }}
            >
              <img
                src="/mooncliq-puzzle-only.png"
                alt="moonCliq"
                style={{
                  height: '32px',
                  width: '32px',
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
              <img
                src="/mooncliq-text-only.png"
                alt="moonCliq CRM"
                style={{
                  height: '26px',
                  width: 'auto',
                  objectFit: 'contain',
                  imageRendering: '-webkit-optimize-contrast',
                  display: 'block'
                }}
              />
            </div>
          )}

          {/* Sleek Toggle Button (Collapsed me Right-Border Floating Pill, Expanded me Header Button) */}
          <button
            onClick={toggleSidebar}
            style={isCollapsed ? {
              position: 'absolute',
              right: '-11px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              zIndex: 100,
              transition: 'background-color 0.2s, transform 0.2s'
            } : {
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: '6px',
              transition: 'color 0.2s'
            }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width={isCollapsed ? "13" : "18"}
              height={isCollapsed ? "13" : "18"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        <nav suppressHydrationWarning className="sidebar-nav" style={{ padding: '0.5rem 0', flex: 1, overflow: isCollapsed ? 'visible' : 'auto' }}>
          {categories.map((category, idx) => (
            <React.Fragment key={idx}>
              {category.name === "COMMUNICATION" && isMounted && customModules.length > 0 && (() => {
                const visibleCustomModules = customModules.filter(mod => hasPermission(userInfo, mod.name, 'view'));
                if (visibleCustomModules.length === 0) return null;

                const activeCustomModule = visibleCustomModules.find(mod => pathname === `/custom-module/${mod.id}`) || visibleCustomModules[0];
                const isCustomActive = visibleCustomModules.some(mod => pathname === `/custom-module/${mod.id}`);

                return (
                  <div suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', marginBottom: isCollapsed ? '0.5rem' : '1rem' }}>
                    {!isCollapsed ? (
                      <>
                        <div
                          onClick={() => setOpenCategory(openCategory === "CUSTOM MODULES" ? "" : "CUSTOM MODULES")}
                          style={{
                            padding: '0.5rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: openCategory === "CUSTOM MODULES" ? '#475569' : '#9ca3af',
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            userSelect: 'none'
                          }}
                        >
                          <span>CUSTOM MODULES</span>
                          <svg className="category-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openCategory === "CUSTOM MODULES" ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>

                        <div className={`accordion-collapse ${openCategory === "CUSTOM MODULES" ? 'open' : ''}`}>
                          <div className="accordion-inner">
                            {visibleCustomModules.map((mod) => (
                              <Link
                                key={mod.id}
                                href={`/custom-module/${mod.id}`}
                                onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                                className={`nav-item ${pathname === `/custom-module/${mod.id}` ? "active" : ""}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.6rem',
                                  textDecoration: 'none',
                                  justifyContent: 'flex-start',
                                  padding: '0.4rem 1.25rem',
                                  margin: '0.15rem 0.75rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                                title={mod.name}
                              >
                                <DynamicLucideIcon name={mod.icon} />
                                <span style={{ whiteSpace: 'nowrap' }}>{mod.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Collapsed Mini Mode - Flyout Menu on Hover */
                      <div className="mini-group-wrapper" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <Link
                          href={`/custom-module/${activeCustomModule.id}`}
                          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                          className={`nav-item ${isCustomActive ? "active" : ""}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            padding: 0,
                            margin: '0.15rem auto',
                            borderRadius: '8px',
                            textDecoration: 'none'
                          }}
                          title="Custom Modules"
                        >
                          <DynamicLucideIcon name={activeCustomModule.icon} />
                        </Link>

                        {/* Floating Popout Box */}
                        <div
                          className="mini-flyout-menu"
                          style={{
                            position: 'absolute',
                            left: '68px',
                            top: '0px',
                            width: '180px',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            padding: '6px',
                            display: 'none',
                            flexDirection: 'column',
                            gap: '2px',
                            zIndex: 999999
                          }}
                        >
                          <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: '700', color: '#94a3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                            CUSTOM MODULES
                          </div>
                          {visibleCustomModules.map((mod) => (
                            <Link
                              key={mod.id}
                              href={`/custom-module/${mod.id}`}
                              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                              className={`nav-item ${pathname === `/custom-module/${mod.id}` ? "active" : ""}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.4rem 0.75rem',
                                margin: '1px 0',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                textDecoration: 'none'
                              }}
                            >
                              <DynamicLucideIcon name={mod.icon} />
                              <span style={{ whiteSpace: 'nowrap' }}>{mod.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}


              {(() => {
                const defaultModules = ["Lead", "Deal", "Account", "Task", "Products"];
                const activeMods = userInfo.activeModules && userInfo.activeModules.length > 0
                  ? userInfo.activeModules
                  : defaultModules;

                // Category ke wahi items nikalo jinki user ke paas Permission hai
                const visibleItems = category.items.filter((item) => {
                  if ((category.name === "CRM" || category.name === "WORK") && !activeMods.includes(item.name)) {
                    return false;
                  }
                  const permissionControlledModules = ["Lead", "Deal", "Account", "Task", "Products", "Whatsapp", "Campaigns"];
                  if (permissionControlledModules.includes(item.name)) {
                    const moduleKey = item.name === "Products" ? "Product" : item.name;
                    if (!hasPermission(userInfo, moduleKey, "view")) {
                      return false; // 👈 Deal, Task ya koi bhi unpermitted module hide!
                    }
                  }
                  return true;
                });

                // Agar category ke saare items hide ho gaye (jaise Task hide hone par WORK khali ho gaya), toh poori category hide!
                if (visibleItems.length === 0) return null;

                const isCatOpen = openCategory === category.name || category.name === "OVERVIEW";
                const isCategoryActive = visibleItems.some(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')));
                const showLimeHighlight = !isCatOpen && isCategoryActive && category.name !== "OVERVIEW";

                return (
                  <div style={{ marginBottom: isCollapsed ? '0.5rem' : '1rem' }}>
                    {/* Category Header */}
                    {!isCollapsed && (
                      <div
                        onClick={() => category.name !== "OVERVIEW" && setOpenCategory(openCategory === category.name ? "" : category.name)}
                        style={{
                          padding: showLimeHighlight ? '0.45rem 1rem' : '0.5rem 1.5rem',
                          margin: showLimeHighlight ? '0.2rem 0.75rem' : '0',
                          borderRadius: showLimeHighlight ? '8px' : '0',
                          backgroundColor: showLimeHighlight ? '#d8f95c' : 'transparent',
                          fontSize: '0.75rem',
                          fontWeight: showLimeHighlight ? '700' : '600',
                          color: showLimeHighlight ? '#111827' : (isCatOpen ? '#475569' : '#9ca3af'),
                          letterSpacing: '0.05em',
                          cursor: category.name === "OVERVIEW" ? 'default' : 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          userSelect: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>{category.name}</span>

                        {category.name !== "OVERVIEW" && (
                          <svg className="category-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCatOpen ? 'rotate(0deg)' : 'rotate(-90deg)', color: showLimeHighlight ? '#111827' : '#9ca3af' }}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        )}
                      </div>
                    )}

                    {/* 1. Full Expanded Mode Items with Buttery Smooth CSS Grid Accordion */}
                    {!isCollapsed && (
                      <div className={`accordion-collapse ${isCatOpen ? 'open' : ''}`}>
                        <div className="accordion-inner">
                          {visibleItems.map((item, itemIdx) => (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                              className={`nav-item ${pathname === item.href ? "active" : ""}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                textDecoration: 'none',
                                padding: '0.4rem 1.25rem',
                                margin: '0.15rem 0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={item.name}>
                                {item.icon}
                              </span>
                              <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 2. Mini Collapsed Mode (Hover Floating Flyout) */}
                    {isCollapsed && (
                      <div
                        className="mini-group-wrapper"
                        style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}
                      >
                        {(() => {
                          const activeItem = visibleItems.find(i => pathname === i.href) || visibleItems[0];
                          const isGroupActive = visibleItems.some(i => pathname === i.href);

                          return (
                            <Link
                              href={activeItem.href}
                              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                              className={`nav-item ${isGroupActive ? "active" : ""}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                padding: 0,
                                margin: '0.15rem auto',
                                borderRadius: '8px'
                              }}
                              title={category.name}
                            >
                              {activeItem.icon}
                            </Link>
                          );
                        })()}

                        {/* Floating Popout Box */}
                        <div
                          className="mini-flyout-menu"
                          style={{
                            position: 'absolute',
                            left: '68px',
                            top: '0px',
                            width: '180px',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            padding: '6px',
                            display: 'none',
                            flexDirection: 'column',
                            gap: '2px',
                            zIndex: 999999
                          }}
                        >
                          <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: '700', color: '#94a3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                            {category.name}
                          </div>
                          {visibleItems.map((item, itemIdx) => (
                            <Link
                              key={itemIdx}
                              href={item.href}
                              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
                              className={`nav-item ${pathname === item.href ? "active" : ""}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.4rem 0.75rem',
                                margin: '1px 0',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                textDecoration: 'none'
                              }}
                            >
                              <span>{item.icon}</span>
                              <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );

              })()}
            </React.Fragment>
          ))}        </nav>

        <div style={{ marginTop: 'auto', padding: isCollapsed ? '1rem 0' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
          {userInfo?.canAccessSettings && (
            <Link href="/settings" className={`nav-item sidebar-settings-link ${pathname === "/settings" ? "active" : ""}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.5rem 0' : '0.4rem 1.25rem', margin: isCollapsed ? '0.15rem' : '0.15rem 0.75rem', fontSize: '0.85rem', fontWeight: '500', color: '#334155' }} title="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
            </Link>
          )}


          {/* ----- YAHAN SE NAYA PROFILE POPOVER START HOTA HAI ----- */}
          <div style={{ position: 'relative', width: '100%' }}>

            {/* Popover Card */}
            {isProfileMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setIsProfileMenuOpen(false)}
                ></div>
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: isCollapsed ? '4.5rem' : '2rem',
                  right: 'auto',
                  width: '260px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  border: '1px solid #e5e7eb',
                  padding: '1.25rem',
                  marginBottom: '0.5rem',
                  zIndex: 50
                }}>
                  {/* <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userInfo.orgName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {userInfo.email}
                    </div>
                  </div> 
                  */}

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      {userInfo.avatarUrl ? (
                        <img src={userInfo.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: 'bold' }}>
                          {userInfo.nickname ? userInfo.nickname.substring(0, 2).toUpperCase() : '👤'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
                      {userInfo.nickname}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: '600', marginBottom: '0.3rem' }}>
                      {userInfo.role}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userInfo.email} • {userInfo.orgName}
                    </div>
                  </div>


                  <hr style={{ borderTop: '1px solid #f1f5f9', margin: '0 -1rem 0.5rem -1rem' }} />

                  <button
                    onClick={handleSignOut}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.875rem' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sign out
                  </button>
                </div>
              </>
            )}

            {/* Profile Toggle Button (Jo hamesha dikhega) */}
            {/* Profile Toggle Button (Jo hamesha dikhega) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="nav-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0.5rem 0' : '0.4rem 1.25rem',
                margin: isCollapsed ? '0.15rem' : '0.15rem 0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: '#334155'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>

              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Profile</span>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}