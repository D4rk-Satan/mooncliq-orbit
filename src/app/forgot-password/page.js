"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const output = await resetPassword({ username: email });
      const { nextStep } = output;
      switch (nextStep.resetPasswordStep) {
        case 'CONFIRM_RESET_PASSWORD_WITH_CODE':
          setStep(2);
          break;
        case 'DONE':
          router.push('/sign-in');
          break;
      }
    } catch (err) {
      setError(err.message || 'Failed to request password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword
      });
      alert('Password successfully reset! You can now sign in.');
      router.push('/sign-in');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            {step === 1 ? "Enter your email to receive a recovery code." : "Enter the code sent to your email."}
          </p>
        </div>

        {error && <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Sending Code...' : 'Send Recovery Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset}>
            <div className="form-group">
              <label className="form-label" htmlFor="code">Recovery Code</label>
              <input
                type="text"
                id="code"
                className="form-input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                className="form-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="form-button" disabled={isLoading}>
              {isLoading ? 'Resetting Password...' : 'Confirm & Reset'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remember your password?{' '}
          <Link href="/sign-in" className="auth-link">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
