import Link from 'next/link';
import { BarChart2, Users, FileText } from 'lucide-react';
import FAQ from '../components/FAQ';
import './landing.css';
export default function Home() {
  return (
    <div className="landing-body">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-links">
          <Link href="#features">Features</Link>
          <Link href="#blog">Blog</Link>
          <Link href="#services">Services</Link>
        </div>
        <Link href="/" className="landing-logo">moonCliq</Link>
        <div className="landing-nav-cta">
          <Link href="/sign-in" style={{ textDecoration: 'none', color: '#1c1917', fontWeight: 500 }}>Log In</Link>
          <Link href="/sign-up" className="btn-dark">Get started for Free ➔</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Close Deals Faster,<br />Manage Leads Smarter</h1>
        <p className="hero-subtitle">The ultimate CRM to track pipelines, organize contacts, and drive revenue — powered by the Blueprint Engine.</p>
        <Link href="/sign-up" className="btn-dark" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Get started for Free ➔
        </Link>
      </section>

      {/* 3D Curved Carousel */}
      <div className="carousel-container">
        {/* Placeholder images from Unsplash matching the mockup vibe */}
        <div className="carousel-card card-1"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        <div className="carousel-card card-2"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        <div className="carousel-card card-3"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        
        {/* Center Card */}
        <div className="carousel-card card-4"><img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        
        <div className="carousel-card card-5"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        <div className="carousel-card card-6"><img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
        <div className="carousel-card card-7"><img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400" alt="Team member" /></div>
      </div>

      {/* Value Props Row */}
      <section className="value-props">
        <div className="value-prop-item">
          <div className="value-prop-icon"><BarChart2 size={24} /></div>
          <div className="value-prop-text">
            <h3 className="value-prop-title">Dynamic Pipelines</h3>
            <p className="value-prop-desc">Visualize your entire sales process with customizable pipelines that adapt to your workflow.</p>
          </div>
        </div>
        <div className="value-prop-divider"></div>
        <div className="value-prop-item">
          <div className="value-prop-icon"><Users size={24} /></div>
          <div className="value-prop-text">
            <h3 className="value-prop-title">Centralized Lead Data</h3>
            <p className="value-prop-desc">Keep every interaction, note, and custom field organized in one place — so your team stays aligned.</p>
          </div>
        </div>
        <div className="value-prop-divider"></div>
        <div className="value-prop-item">
          <div className="value-prop-icon"><FileText size={24} /></div>
          <div className="value-prop-text">
            <h3 className="value-prop-title">Blueprint Engine</h3>
            <p className="value-prop-desc">Define exact data requirements for every stage and ensure your team follows the right process every time.</p>
          </div>
        </div>
      </section>

      {/* Bento Box Section */}
      <section className="bento-section" id="features">
        <div className="bento-header">
          <h2 className="bento-title">Everything You Need to Scale Your Sales</h2>
          <p className="bento-subtitle">From lead capture to deal closing, our CRM is built to keep your sales team laser-focused and moving forward.</p>
        </div>

        <div className="bento-grid">
          {/* Chat Image spanning 2 columns */}
          <div className="bento-card bento-chat">
            <h3>Visual Kanban Boards</h3>
            <p>Drag-and-drop your leads through custom stages instantly.</p>
          </div>
          
          <div className="bento-card bento-assignment">
            <h3>Strict Data Governance</h3>
            <p>Ensure your team collects the right data before advancing a lead.</p>
          </div>
          
          <div className="bento-card bento-scheduling">
            <h3>Custom Lead Fields</h3>
            <p>Capture the unique data that matters to your business.</p>
          </div>
          
          <div className="bento-card bento-tracking">
            <h3>Audit Logs & History</h3>
            <p>Track exactly who moved what lead, and when, for total accountability.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* Footer / Call to Action */}
      <footer className="landing-footer">
        <h2>Built for Modern Sales Teams</h2>
        <p>Join the fastest-growing businesses using moonCliq to predictably scale their revenue.</p>
        <Link href="/sign-up" className="btn-dark" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Get started for Free ➔
        </Link>
      </footer>
    </div>
  );
}
