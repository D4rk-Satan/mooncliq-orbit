import Link from 'next/link';
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
        <h1 className="hero-title">Streamline Your Team,<br />Supercharge Your Workflow</h1>
        <p className="hero-subtitle">All-in-one platform to plan, collaborate, and deliver — faster and smarter.</p>
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
          <h3 className="value-prop-title">Real-Time Collaboration</h3>
          <p className="value-prop-desc">Communicate seamlessly and keep everyone in sync with built-in messaging, file sharing, and live updates.</p>
        </div>
        <div className="value-prop-item">
          <h3 className="value-prop-title">Task & Project Tracking</h3>
          <p className="value-prop-desc">Assign tasks, set deadlines, and visualize progress with boards, lists, and timelines tailored to your team's style.</p>
        </div>
        <div className="value-prop-item">
          <h3 className="value-prop-title">Performance Insights</h3>
          <p className="value-prop-desc">Make smarter decisions with analytics that show productivity trends, bottlenecks, and team workload balance.</p>
        </div>
      </section>

      {/* Bento Box Section */}
      <section className="bento-section" id="features">
        <div className="bento-header">
          <h2 className="bento-title">Everything Your Team Needs to Work Smarter</h2>
          <p className="bento-subtitle">From task tracking to real-time chat, our features are built to keep your team connected, organized, and moving forward—together.</p>
        </div>

        <div className="bento-grid">
          {/* Chat Image spanning 2 columns */}
          <div className="bento-card bento-chat">
            <h3>Built-In Team Chat</h3>
            <p>Communicate instantly, without jumping between tools.</p>
          </div>
          
          <div className="bento-card bento-assignment">
            <h3 style={{ color: '#1c1917' }}>Task Assignment</h3>
            <p style={{ color: '#57534e' }}>Easily create, assign, and track tasks to keep everyone aligned.</p>
          </div>
          
          <div className="bento-card bento-scheduling">
            <h3 style={{ color: '#1c1917' }}>Real-Time Scheduling</h3>
            <p style={{ color: '#57534e' }}>Plan meetings, set deadlines, and sync calendars.</p>
          </div>
          
          <div className="bento-card bento-tracking">
            <h3>Progress Tracking</h3>
            <p>Visualize team performance with dynamic dashboards.</p>
          </div>
        </div>
      </section>

      {/* Footer / Call to Action */}
      <footer className="landing-footer">
        <h2>Proven Results, Real Impact</h2>
        <p>See how teams around the world are working faster and communicating better.</p>
        <Link href="/sign-up" className="btn-dark" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Get started for Free ➔
        </Link>
      </footer>
    </div>
  );
}
