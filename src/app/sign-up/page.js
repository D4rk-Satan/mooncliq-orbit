"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState('signup'); // 'signup' or 'confirm'
  const [formData, setFormData] = useState({ name: '', company: '', email: '', password: '', code: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            name: formData.name,
          }
        }
      });
      setStep('confirm');
    } catch (err) {
      setError(err.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await confirmSignUp({
        username: formData.email,
        confirmationCode: formData.code
      });
      router.push('/sign-in');
    } catch (err) {
      setError(err.message || 'Invalid confirmation code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">{step === 'signup' ? 'Create Account' : 'Verify Email'}</h2>
          <p className="auth-subtitle">
            {step === 'signup' ? 'Get started with your free trial' : `We sent a code to ${formData.email}`}
          </p>
        </div>

        {error && <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {step === 'signup' ? (
          <form onSubmit={handleSignUpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="company">Company Name</label>
              <input
                type="text"
                id="company"
                className="form-input"
                placeholder="Your Co."
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                required
              />
            </div>

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
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="code">Confirmation Code</label>
              <input
                type="text"
                id="code"
                className="form-input"
                placeholder="123456"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                required
              />
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        )}

        {step === 'signup' && (
          <div className="auth-footer">
            Already have an account?{' '}
            <Link href="/sign-in" className="auth-link">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
