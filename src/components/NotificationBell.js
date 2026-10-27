"use client";

import React, { useState, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationBell({ isCollapsed = false }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  // Poll every 10s for fresh notifications & listen to instant triggers
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    // Instant trigger when any lead/record is created on this client
    const handleInstantRefresh = () => fetchNotifications();
    window.addEventListener("orbit-refresh-notifications", handleInstantRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("orbit-refresh-notifications", handleInstantRefresh);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Mark single as read
  const handleMarkAsRead = async (notification) => {
    if (!notification.isRead) {
      try {
        const { fetchAuthSession } = await import("aws-amplify/auth");
        const { tokens } = await fetchAuthSession();
        const token = tokens?.idToken?.toString();

        await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notificationId: notification.id })
        });

        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }

    if (notification.actionUrl) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ markAll: true })
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Clear read notifications
  const handleClearAll = async () => {
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Helpers for Type Styling
  const getTypeMeta = (type) => {
    switch (type) {
      case "urgent":
        return {
          icon: <LucideIcons.AlertTriangle size={16} color="#f43f5e" />,
          borderColor: "#f43f5e",
          badgeBg: "#fff1f2",
          badgeText: "#e11d48",
          label: "Urgent"
        };
      case "warning":
        return {
          icon: <LucideIcons.Clock size={16} color="#f59e0b" />,
          borderColor: "#f59e0b",
          badgeBg: "#fffbeb",
          badgeText: "#d97706",
          label: "Warning"
        };
      case "success":
        return {
          icon: <LucideIcons.CheckCircle2 size={16} color="#10b981" />,
          borderColor: "#10b981",
          badgeBg: "#f0fdf4",
          badgeText: "#059669",
          label: "Success"
        };
      default:
        return {
          icon: <LucideIcons.Info size={16} color="#3b82f6" />,
          borderColor: "#3b82f6",
          badgeBg: "#eff6ff",
          badgeText: "#2563eb",
          label: "Info"
        };
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={popoverRef} style={{ position: "relative" }}>
      {/* BELL TRIGGER BUTTON */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="notification-bell-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.15s ease"
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <LucideIcons.Bell size={18} strokeWidth={1.75} color="#64748b" style={{ flexShrink: 0 }} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-8px",
                backgroundColor: "#f43f5e",
                color: "#ffffff",
                fontSize: "0.65rem",
                fontWeight: 700,
                borderRadius: "10px",
                minWidth: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                boxShadow: "0 1px 3px rgba(244, 63, 94, 0.4)"
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* FLOATING NOTIFICATION POPOVER */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.5rem",
            width: "360px",
            maxHeight: "480px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden"
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>
                Activity & Alerts
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#111827",
                    color: "#D4F870",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "10px"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Mark all read
                </button>
              )}
              {notifications.some((n) => n.isRead) && (
                <button
                  onClick={handleClearAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                >
                  Clear read
                </button>
              )}
            </div>
          </div>

          {/* NOTIFICATION CARDS LIST */}
          <div style={{ overflowY: "auto", flex: 1, padding: "0.5rem" }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                <LucideIcons.BellOff size={32} style={{ margin: "0 auto 0.5rem auto", opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 500 }}>No notifications yet</p>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Alerts from workflows will appear here</span>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getTypeMeta(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n)}
                    style={{
                      padding: "0.75rem 0.85rem",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      borderLeft: `3px solid ${meta.borderColor}`,
                      backgroundColor: n.isRead ? "#ffffff" : "#f8fafc",
                      border: n.isRead ? "1px solid #f1f5f9" : "1px solid #e2e8f0",
                      borderLeftWidth: "3px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = n.isRead ? "#f8fafc" : "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = n.isRead ? "#ffffff" : "#f8fafc";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                      <div style={{ marginTop: "2px" }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                          <span
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: n.isRead ? 600 : 700,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {n.title}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#94a3b8", flexShrink: 0 }}>
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "3px 0 0 0",
                            fontSize: "0.78rem",
                            color: n.isRead ? "#64748b" : "#334155",
                            lineHeight: "1.3"
                          }}
                        >
                          {n.message}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            marginTop: "6px",
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
