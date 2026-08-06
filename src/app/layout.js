import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata = {
  title: "MoonCliq CRM | Sign In",
  description: "Textile Industry CRM developed by MoonCliq",
};

import AmplifyProvider from "../components/AmplifyProvider";
import DashboardLayoutWrapper from "../components/DashboardLayoutWrapper";
import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <NextTopLoader color="#ef4444" showSpinner={false} />
        <AmplifyProvider>
          <DashboardLayoutWrapper>
            {children}
          </DashboardLayoutWrapper>
        </AmplifyProvider>
      </body>
    </html>
  );
}
