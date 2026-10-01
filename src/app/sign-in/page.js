"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in when the page loads
  useEffect(() => {
    getCurrentUser()
      .then(() => {
        router.push('/dashboard');
      })
      .catch(() => {
        // Not logged in, let them see the sign-in form
      });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { isSignedIn } = await signIn({
        username: formData.email,
        password: formData.password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH'
        }
      });
      
      if (isSignedIn) {
        router.push('/dashboard');
      }
    } catch (err) {
      // Handle the case where AWS Cognito says user is already logged in
      if (err.name === 'UserAlreadyAuthenticatedException' || err.message.toLowerCase().includes('already authenticated') || err.message.toLowerCase().includes('already logged in')) {
        router.push('/dashboard');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
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
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
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
  );
}
