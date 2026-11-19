import React from 'react';
import fs from 'fs';
import path from 'path';
import './orbit-landing.css';

export const metadata = {
  title: 'moonCliq Orbit CRM | Sales Process & Official WhatsApp Operating System',
  description: 'Stop losing deals to missed follow-ups. moonCliq Orbit brings stage gate blueprints, process enforcement, auto reminders, and official WhatsApp messaging into one modern CRM.',
};

export default function Home() {
  const htmlPath = path.join(process.cwd(), 'src/app/landing-processed.html');
  const landingHtml = fs.readFileSync(htmlPath, 'utf8');

  return (
    <main 
      className="orbit-landing-root"
      dangerouslySetInnerHTML={{ __html: landingHtml }} 
    />
  );
}
