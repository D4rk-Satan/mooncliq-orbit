"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signIn } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { isSignedIn } = await signIn({
        username: formData.email,
        password: formData.password,
      });
      
      if (isSignedIn) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Panel - Branding */}
      <div className="auth-left-panel">
        <div className="logo-container">
          <Image
            src="/logo.png"
            alt="MoonCliq Logo"
            width={320}
            height={103}
            className="auth-brand-logo"
            style={{ width: '100%', height: 'auto', maxWidth: '350px' }}
            priority
          />
        </div>
        <h1 className="auth-tagline">Engineered<br />For Growth.</h1>
        <p className="auth-description">
          MoonCliq delivers cutting-edge CRM and business integrations tailored for the textile industry. Scale your operations, automate workflows, and grow with confidence.
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to your CRM dashboard</p>
          </div>

          {error && <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <Link href="/forgot-password" className="auth-link forgot-password">
                Forgot your password?
              </Link>
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link href="/sign-up" className="auth-link">
              Sign up here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
