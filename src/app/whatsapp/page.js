"use client";

import React, { useState, useEffect } from "react";
import WhatsAppChatView from "./WhatsAppChatView";
import WhatsAppSetupPrompt from "@/components/WhatsAppSetupPrompt";
import GlobalLoader from "@/components/ui/GlobalLoader";

export default function WhatsAppPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        if (!tokens) {
          setIsLoading(false);
          return;
        }

        const token = tokens.idToken.toString();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);

          const hasPhoneId = Boolean(userData?.organization?.whatsappPhoneNumberId);
          const hasToken = Boolean(userData?.organization?.whatsappAccessToken);
          setIsConfigured(hasPhoneId && hasToken);
        }
      } catch (error) {
        console.error("Failed to check WhatsApp configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <GlobalLoader />
      </div>
    );
  }

  // Agar WhatsApp API setup nahi hai to Setup Prompt Page render karein
  if (!isConfigured) {
    return <WhatsAppSetupPrompt moduleName="WhatsApp" />;
  }

  // Agar setup hai to Chat View render karein with currentUser permissions
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WhatsAppChatView currentUser={currentUser} />
    </div>
  );
}
