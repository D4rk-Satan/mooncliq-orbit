"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { useRouter } from "next/navigation";

const PasswordRequirements = ({ password }) => {
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "One uppercase", met: /[A-Z]/.test(password) },
    { label: "One lowercase", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="password-requirements">
      {requirements.map((req, idx) => (
        <div key={idx} className={`req-item ${req.met ? 'met' : 'unmet'}`}>
          <span className="req-icon">{req.met ? '✓' : '○'}</span>
          {req.label}
        </div>
      ))}
    </div>
  );
};

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState('account'); // 'account', 'organization', or 'confirm'
  const [formData, setFormData] = useState({ name: '', company: '', email: '', password: '', gstNumber: '', industry: '', teamSize: '', logoUrl: '', code: '' });
  const [gstError, setGstError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [invitedContext, setInvitedContext] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('invited') === 'true') {
      const email = params.get('email') || '';
      const company = params.get('orgName') || 'Workspace';
      setInvitedContext({ email, company });
      setFormData(prev => ({ ...prev, email, company }));
    }
  }, []);


  // 1. GST Validation (Auto-Uppercase + Optional + 15-char Regex)
  const handleGstChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    setFormData(prev => ({ ...prev, gstNumber: val }));

    if (!val) {
      setGstError(''); // Optional hai, empty allowed hai
      return;
    }

    if (val.length === 15) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(val)) {
        setGstError('Invalid GSTIN format (e.g. 24AAACC1206D1ZH)');
      } else {
        setGstError('');
      }
    } else {
      setGstError('GSTIN must be 15 characters');
    }
  };

  // 2. Logo Upload to S3
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&folder=logos`);
      const data = await res.json();
      if (data.uploadUrl) {
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });
        setFormData(prev => ({ ...prev, logoUrl: data.fileUrl }));
      }
    } catch (err) {
      console.error('Logo upload error:', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // 3. Step 1 se Step 2 par jane ka handler
  const handleNextToOrg = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || formData.password.length < 8) {
      setError('Please fill in all details and fulfill password requirements.');
      return;
    }

    // Agar invited employee hai toh seedha create account chalega (no org form)
    if (invitedContext) {
      executeSignUp();
    } else {
      setStep('organization');
    }
  };

  // 4. Step 2 (Organization) Submit handler
  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.company.trim()) {
      setError('Company Name is required.');
      return;
    }

    if (formData.gstNumber) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (formData.gstNumber.length !== 15 || !gstRegex.test(formData.gstNumber)) {
        setError('Please provide a valid 15-character GSTIN or leave it blank.');
        return;
      }
    }

    executeSignUp();
  };

  // 5. Actual Cognito SignUp
  const executeSignUp = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Organization details ko localStorage me save kar lete hain taaki login ke baad persist rahe
      if (!invitedContext) {
        localStorage.setItem('pending_org_setup', JSON.stringify({
          companyName: formData.company.trim(),
          orgName: formData.company.trim(),
          gstNumber: formData.gstNumber ? formData.gstNumber.trim().toUpperCase() : null,
          industry: formData.industry || null,
          teamSize: formData.teamSize || null,
          logoUrl: formData.logoUrl || null
        }));
      }

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
            {invitedContext ? (
              <>
                <h2 className="auth-title">Welcome to Mooncliq Orbit</h2>
                <p className="auth-subtitle" style={{ color: '#0f172a', backgroundColor: '#d9f99d', padding: '6px', borderRadius: '4px', fontWeight: 500 }}>
                  🎉 You have been invited to join <strong>{invitedContext.company}</strong>. Set your password to complete your profile.
                </p>
              </>
            ) : (
              <>
                <h2 className="auth-title">
                  {step === 'confirm' ? 'Verify Email' : (step === 'organization' ? 'Organization Details' : 'Create Account')}
                </h2>
                <p className="auth-subtitle">
                  {step === 'confirm'
                    ? `We sent a code to ${formData.email}`
                    : (step === 'organization' ? 'Step 2: Tell us about your company' : 'Step 1: Get started with your free trial')}
                </p>
              </>
            )}
          </div>

          {error && (
            <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* STEP 1: Personal Details */}
          {step === 'account' && (
            <form onSubmit={handleNextToOrg}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-input"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!invitedContext}
                  style={invitedContext ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                />
              </div>

              <div className="password-input-wrapper" style={{ display: 'none' }}></div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                <PasswordRequirements password={formData.password} />
              </div>

              <button type="submit" className="form-button">
                {invitedContext ? 'Sign Up' : 'Continue to Organization →'}
              </button>
            </form>
          )}

          {/* STEP 2: Organization Details */}
          {step === 'organization' && (
            <form onSubmit={handleOrgSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="company">Company Name</label>
                <input
                  type="text"
                  id="company"
                  className="form-input"
                  placeholder="Acme Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="gstNumber">GST Number (Optional)</label>
                <input
                  type="text"
                  id="gstNumber"
                  className="form-input"
                  placeholder="24AAACC1206D1ZH"
                  maxLength={15}
                  value={formData.gstNumber}
                  onChange={handleGstChange}
                />
                {gstError && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{gstError}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="industry">Industry</label>
                <select
                  id="industry"
                  className="form-input"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                >
                  <option value="">Select industry...</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Software">Software & IT</option>
                  <option value="Agency">Marketing Agency</option>
                  <option value="Textile">Textile</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="teamSize">Team Size</label>
                <select
                  id="teamSize"
                  className="form-input"
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                >
                  <option value="">Select size...</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201+">201+</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Company Logo (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    style={{ flex: 1 }}
                  />
                  {formData.logoUrl && (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo Preview" 
                      style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} 
                    />
                  )}
                </div>
                {isUploadingLogo && <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Uploading logo...</p>}
                {formData.logoUrl && !isUploadingLogo && <p style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.25rem' }}>✓ Logo uploaded successfully</p>}
              </div>

              <button type="submit" className="form-button" disabled={isLoading || isUploadingLogo}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>

              <button
                type="button"
                onClick={() => setStep('account')}
                style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ← Back
              </button>
            </form>
          )}

          {/* STEP 3: OTP Confirmation */}
          {step === 'confirm' && (
            <form onSubmit={handleConfirmSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="code">Confirmation Code</label>
                <input
                  type="text"
                  id="code"
                  className="form-input"
                  placeholder="123456"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="form-button" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          )}

          {(step === 'account' || step === 'organization') && (
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
