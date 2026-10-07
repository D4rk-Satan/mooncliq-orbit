import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import "./forms.css";
import { ConfirmProvider } from "../contexts/ConfirmContext";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata = {
  title: "MoonCliq CRM | Sign In",
  description: "Textile Industry CRM developed by MoonCliq",
};

import AmplifyProvider from "../components/AmplifyProvider";
import DashboardLayoutWrapper from "../components/DashboardLayoutWrapper";
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'react-hot-toast';
import { cookies } from 'next/headers';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const isOnboardingDone = cookieStore.get('mooncliq_onboarding_done')?.value === 'true';

  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <NextTopLoader color="#a356ebff" showSpinner={false} />
        <Toaster position="top-right" />
        <AmplifyProvider>
          <DashboardLayoutWrapper initialOnboardingDone={isOnboardingDone}>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </DashboardLayoutWrapper>
        </AmplifyProvider>
      </body>
    </html>
  );
}
