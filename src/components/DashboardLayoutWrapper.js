"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayoutWrapper({ children }) {
  const pathname = usePathname();
  const authRoutes = ['/', '/sign-in', '/sign-up', '/forgot-password'];
  const isAuthPage = authRoutes.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      {children}
    </div>
  );
}
