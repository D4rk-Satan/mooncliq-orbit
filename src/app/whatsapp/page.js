"use client";

import React from "react";
import WhatsAppChatView from "./WhatsAppChatView";

export default function WhatsAppPage() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <WhatsAppChatView />
    </div>
  );
}
