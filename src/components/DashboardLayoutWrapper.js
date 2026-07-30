"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayoutWrapper({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/sign-in' || pathname === '/';

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
