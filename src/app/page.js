import React from 'react';
import fs from 'fs';
import path from 'path';
import './orbit-landing.css';

export default function Home() {
  // Read extracted HTML file synchronously on server
  const htmlPath = path.join(process.cwd(), 'src/app/landing-body-extracted.html');
  const landingHtml = fs.readFileSync(htmlPath, 'utf8');

  return (
    <div 
      className="orbit-landing-root"
      dangerouslySetInnerHTML={{ __html: landingHtml }} 
    />
  );
}
