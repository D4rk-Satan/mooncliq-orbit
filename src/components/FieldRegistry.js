import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import TaskRepeatDropdown from './TaskRepeatDropdown';
import TaskAlertDropdown from './TaskAlertDropdown';
import { Parser } from 'expr-eval';
import Button from './ui/Button';
import countries from '../utils/countries.json';
import countriesData from '../utils/countries.json';


// image upload field (Max 4 Images, Manual Upload)
const ImageUploadInput = ({ field, value, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // Files selected but not yet uploaded

  // Treat value as an array (Support backward compatibility if it's a string)
  let uploadedUrls = [];
  try {
    if (Array.isArray(value)) uploadedUrls = value;
    else if (typeof value === 'string' && value.startsWith('[')) uploadedUrls = JSON.parse(value);
    else if (value) uploadedUrls = [value];
  } catch (e) { uploadedUrls = [value]; }

  const totalImagesCount = uploadedUrls.length + pendingFiles.length;

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (totalImagesCount + files.length > 4) {
      alert("Aap maximum 4 images hi upload kar sakte hain.");
      return;
    }

    setPendingFiles(prev => [...prev, ...files]);
    // Reset input so same file can be selected again if removed
    e.target.value = null;
  };

  const handleRemovePending = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploaded = (index) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    onChange(field.name, newUrls.length ? newUrls : null);
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    try {
      setIsUploading(true);
      const newUploadedUrls = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];

        // 1. Compress Image (5MB -> ~200KB)
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);

        // 2. Get Presigned URL
        const res = await fetch(`/api/upload-url?file=${encodeURIComponent(compressedFile.name)}&fileType=${encodeURIComponent(compressedFile.type)}`);
        const data = await res.json();

        if (!data.uploadUrl) throw new Error("Upload URL not received for " + file.name);

        // 3. Direct Upload to S3
        await fetch(data.uploadUrl, {
          method: "PUT",
          body: compressedFile,
          headers: { "Content-Type": compressedFile.type }
        });

        newUploadedUrls.push(data.fileUrl);
      }

      // 4. Save combined URLs to database state
      const finalUrls = [...uploadedUrls, ...newUploadedUrls];
      onChange(field.name, finalUrls);

      // Clear pending after successful upload
      setPendingFiles([]);

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Ek ya usse zyada images upload nahi ho paayi.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label">{field.label} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Max 4)</span></label>

      <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fafafa', marginTop: '0.5rem' }}>

        {/* Gallery Preview */}
        {(uploadedUrls.length > 0 || pendingFiles.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>

            {/* Show Already Uploaded Images */}
            {uploadedUrls.map((url, idx) => (
              <div key={`up_${idx}`} style={{ position: 'relative' }}>
                <img src={url} alt="Uploaded" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #a7f3d0' }} />
                <button type="button" onClick={() => handleRemoveUploaded(idx)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}

            {/* Show Pending Images (Local Preview) */}
            {pendingFiles.map((file, idx) => (
              <div key={`pen_${idx}`} style={{ position: 'relative' }}>
                <img src={URL.createObjectURL(file)} alt="Pending" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '2px dashed #94a3b8', opacity: 0.7 }} />
                <button type="button" onClick={() => handleRemovePending(idx)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

          <label style={{ display: totalImagesCount >= 4 ? 'none' : 'inline-block', padding: '0.5rem 1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', color: '#334155' }}>
            <input type="file" accept="image/*" multiple onChange={handleFileSelection} style={{ display: 'none' }} disabled={isUploading} />
            + Choose Images
          </label>

          {pendingFiles.length > 0 && (
            <button type="button" onClick={handleUploadAll} disabled={isUploading} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              {isUploading ? "Uploading... ⏳" : `Upload ${pendingFiles.length} Image(s)`}
            </button>
          )}

          {totalImagesCount >= 4 && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Limit reached</span>}
        </div>
      </div>
    </div>
  );
};

// Dedicated Phone Input with Country Code Selector
const PhoneInput = ({ field, value, onChange, onBlur }) => {
  // Parsing initial value (e.g. "+91 9876543210" or "9876543210")
  const parsePhoneValue = (val) => {
    if (!val) return { dialCode: '+91', number: '' };
    const str = String(val).trim();
    if (str.startsWith('+')) {
      const parts = str.split(' ');
      if (parts.length > 1) {
        return { dialCode: parts[0], number: parts.slice(1).join('').replace(/\D/g, '').slice(0, 10) };
      }
      // If no space, match dial_code from countriesData
      const matched = countriesData.find(c => str.startsWith(c.dial_code));
      if (matched) {
        return { dialCode: matched.dial_code, number: str.slice(matched.dial_code.length).replace(/\D/g, '').slice(0, 10) };
      }
    }
    return { dialCode: '+91', number: str.replace(/\D/g, '').slice(0, 10) };
  };

  const [selectedDialCode, setSelectedDialCode] = React.useState(() => parsePhoneValue(value).dialCode);
  const [phoneNumber, setPhoneNumber] = React.useState(() => parsePhoneValue(value).number);

  // Sync if external value changes (e.g., autofill or reset)
  React.useEffect(() => {
    const parsed = parsePhoneValue(value);
    setSelectedDialCode(parsed.dialCode);
    setPhoneNumber(parsed.number);
  }, [value]);

  const handleDialCodeChange = (e) => {
    const newCode = e.target.value;
    setSelectedDialCode(newCode);
    const combined = phoneNumber ? `${newCode} ${phoneNumber}` : '';
    onChange(field.name, combined);
  };

  const handleNumberChange = (e) => {
    const cleanNum = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleanNum);
    const combined = cleanNum ? `${selectedDialCode} ${cleanNum}` : '';
    onChange(field.name, combined);
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      {/* Seamless Single-Box Phone Input Group */}
      <div
        className="phone-input-group form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Country Code Dropdown (Borderless inside capsule) */}
        <select
          value={selectedDialCode}
          onChange={handleDialCodeChange}
          style={{
            border: 'none',
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            height: '100%',
            padding: '0.5rem 0.5rem',
            fontSize: '0.85rem',
            color: '#334155',
            cursor: 'pointer',
            outline: 'none',
            flexShrink: 0
          }}
        >
          {countriesData.map((c) => (
            <option key={`${c.code}-${c.dial_code}`} value={c.dial_code}>
              {c.emoji} {c.dial_code}
            </option>
          ))}
        </select>

        {/* Phone Number Input (Borderless inside capsule) */}
        <input
          type="tel"
          id={field.name}
          name={field.name}
          inputMode="numeric"
          maxLength={10}
          required={field.isRequired}
          value={phoneNumber}
          onBlur={onBlur}
          onChange={handleNumberChange}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '0.5rem 0.75rem',
            fontSize: '0.9rem',
            backgroundColor: 'transparent',
            color: '#1e293b'
          }}
          placeholder="Phone number"
        />
      </div>
    </div>
  );
};



// Renders a simple text input
const TextInput = ({ field, value, onChange, onBlur }) => {
  // Field type ke hisaab se HTML input type decide karo
  let inputType = 'text';
  const fType = (field.type || '').toLowerCase();
  const isPhone = fType === 'phone' || ['phone', 'primaryContact', 'alternatePhone'].includes(field.name);

  if (fType === 'email') inputType = 'email';
  if (fType === 'image') return <ImageUploadInput field={field} value={value} onChange={onChange} />;
  if (isPhone) {
    return <PhoneInput field={field} value={value} onChange={onChange} onBlur={onBlur} />;
  }

  if (fType === 'url') inputType = 'url';

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type={inputType}
        id={field.name}
        name={field.name}
        required={field.isRequired}
        value={value || ''}
        onBlur={onBlur}
        onChange={(e) => {
          let val = e.target.value;
          if (isPhone) {
            val = val.replace(/\D/g, '').slice(0, 10);
          }
          onChange(field.name, val);
        }}
        maxLength={isPhone ? 10 : undefined}
        className="form-input"
        placeholder={isPhone ? "10-digit number" : `Enter ${field.label.toLowerCase()}`}
      />
    </div>
  );
};

// --- NAYA USER INPUT COMPONENT YAHAN START ---
const UserInput = ({ field, value, onChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${tokens.idToken.toString()}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <select
        id={field.name}
        name={field.name}
        required={field.isRequired}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="form-input bg-white"
        disabled={loading || field.readOnly || field.disabled}
        style={(field.readOnly || field.disabled) ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' } : {}}
      >
        <option value="" disabled>
          {loading ? "Loading users..." : `Select ${field.label}`}
        </option>
        {users.map((u) => (
          <option key={u.id || u.email} value={u.profile?.nickname || u.email}>
            {u.profile?.nickname || u.email}
          </option>
        ))}
      </select>
    </div>
  );
};
// --- NAYA USER INPUT COMPONENT YAHAN KHATAM ---



// Renders a number input
const NumberInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="number"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onKeyDown={(e) => {
        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
      }}
      onChange={(e) => onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}

      className="form-input"
      placeholder={`0`}
    />
  </div>
);

// Renders a Barcode/QR Scanner input using html5-qrcode
const BarcodeScannerInput = ({ field, value, onChange }) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = React.useRef(null);

  const startScanner = () => {
    setIsScanning(true);
  };

  const closeScanner = () => {
    setIsScanning(false);
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) { console.error("Error clearing scanner", e); }
    }
  };

  React.useEffect(() => {
    let html5QrcodeScanner;

    if (isScanning) {
      // dynamic import so it doesn't break SSR
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        html5QrcodeScanner = new Html5QrcodeScanner(
          `qr-reader-${field.name}`,
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          /* verbose= */ false
        );
        scannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.render((decodedText) => {
          // On Success
          onChange(field.name, decodedText);
          closeScanner();
        }, (err) => {
          // On Error (ignore, it scans continuously until success)
        });
      });
    }

    return () => {
      if (html5QrcodeScanner) {
        try { html5QrcodeScanner.clear(); } catch (e) { }
      }
    };
  }, [isScanning, field.name, onChange]);

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          id={field.name}
          name={field.name}
          required={field.isRequired}
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="form-input bg-white"
          placeholder="Type or Scan code..."
          style={{ flex: 1 }}
        />
        <Button
          variant="outline"
          type="button"
          onClick={startScanner}
          style={{ height: '52px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          📷 Scan
        </Button>
      </div>

      {isScanning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={closeScanner} style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>&times;</button>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', textAlign: 'center', fontSize: '1.1rem' }}>Scan Barcode / QR</h3>
            <div id={`qr-reader-${field.name}`}></div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>Point your camera at the barcode</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Renders a decimal input
const DecimalInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="number"
      step="any"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, Number(e.target.value))}
      className="form-input"
      placeholder={`0.00`}
    />
  </div>
);

// Renders Radio Buttons (Same options logic as Select)
const RadioInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
      {field.options && field.options.map((option) => (
        <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input
            type="radio"
            name={field.name}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.isRequired}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
          />
          <span style={{ fontSize: '0.9rem', color: '#334155' }}>{option}</span>
        </label>
      ))}
    </div>
  </div>
);

// Renders Autonumber Display (Read Only)
const AutonumberInput = ({ field, value }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      id={field.name}
      name={field.name}
      value={value || '(Auto Generated by System)'}
      disabled
      className="form-input"
      style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
    />
  </div>
);

// Generic File Upload (PDF, Excel, Docs) directly to S3
const FileUploadInput = ({ field, value, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // Files selected but not uploaded

  let uploadedUrls = [];
  try {
    if (Array.isArray(value)) uploadedUrls = value;
    else if (typeof value === 'string' && value.startsWith('[')) uploadedUrls = JSON.parse(value);
    else if (value) uploadedUrls = [value];
  } catch (e) { uploadedUrls = [value]; }

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = null;
  };

  const handleRemovePending = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveUploaded = (index) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    onChange(field.name, newUrls.length ? newUrls : null);
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    try {
      setIsUploading(true);
      const newUploadedUrls = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];

        // Direct upload to S3 for standard files (No compression)
        // Using 'files' folder if upload-url API supports it, else default
        const res = await fetch(`/api/upload-url?file=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&folder=products`);
        const data = await res.json();

        if (!data.uploadUrl) throw new Error("Upload URL not received");

        await fetch(data.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type }
        });
        newUploadedUrls.push(data.fileUrl);
      }

      const finalUrls = [...uploadedUrls, ...newUploadedUrls];
      onChange(field.name, finalUrls);
      setPendingFiles([]);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("File upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label">{field.label} {field.isRequired && <span className="text-red-500">*</span>}</label>
      <div style={{ padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#fafafa', marginTop: '0.5rem' }}>

        {/* List Files */}
        {(uploadedUrls.length > 0 || pendingFiles.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {uploadedUrls.map((url, idx) => (
              <div key={`up-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                  {url.split('/').pop()}
                </a>
                <button type="button" onClick={() => handleRemoveUploaded(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>&times;</button>
              </div>
            ))}
            {pendingFiles.map((file, idx) => (
              <div key={`pen-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%', color: '#64748b' }}>{file.name} (Pending...)</span>
                <button type="button" onClick={() => handleRemovePending(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>&times;</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ cursor: 'pointer', height: '52px', display: 'flex', alignItems: 'center', padding: '0 1.5rem', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '500', fontSize: '0.95rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}>
            + Choose Files
            <input type="file" multiple onChange={handleFileSelection} style={{ display: 'none' }} />
          </label>

          {pendingFiles.length > 0 && (
            <button type="button" onClick={handleUploadAll} disabled={isUploading} style={{ cursor: isUploading ? 'not-allowed' : 'pointer', padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', fontSize: '0.85rem', transition: 'all 0.2s', opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? 'Uploading...' : 'Upload to Cloud'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Renders a percentage input
const PercentageInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="number"
        id={field.name}
        name={field.name}
        required={field.isRequired}
        value={value || ''}
        onChange={(e) => onChange(field.name, Number(e.target.value))}
        className="form-input"
        placeholder={`0`}
        style={{ paddingRight: '2rem' }}
        min="0"
        max="100"
      />
      <span style={{ position: 'absolute', right: '1rem', color: '#64748b', pointerEvents: 'none' }}>%</span>
    </div>
  </div>
);


// Renders a select dropdown
const SelectInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <select
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input bg-white"
    >
      <option value="" disabled>Select {field.label}</option>
      {field.options && field.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

// Renders a date input
const DateInput = ({ field, value, onChange, min }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type={field.name.toLowerCase().includes('time') ? 'datetime-local' : 'date'}
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      min={min}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input"
    />
  </div>
);

// Renders a checkbox input
const CheckboxInput = ({ field, value, onChange }) => (
  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
    <input
      type="checkbox"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      checked={!!value}
      onChange={(e) => onChange(field.name, e.target.checked)}
      style={{ cursor: 'pointer', width: '1.2rem', height: '1.2rem' }}
    />
    <label className="form-label" htmlFor={field.name} style={{ margin: 0, cursor: 'pointer' }}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
  </div>
);

// Renders a textarea
const TextareaInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <textarea
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input"
      placeholder={`Enter ${field.label.toLowerCase()}`}
      rows={3}
    />
  </div>
);

// Renders a currency input
const CurrencyInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
      <input
        type="number"
        id={field.name}
        name={field.name}
        required={field.isRequired}
        value={value || ''}
        onKeyDown={(e) => {
          if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
        }}
        onChange={(e) => onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
        className="form-input"
        style={{ paddingLeft: '1.75rem' }}
        placeholder={`0.00`}
        step="0.01"
      />
    </div>
  </div>
);

import LookupInput from './LookupInput';

// Renders a Subform (One-to-Many grid - Zoho CRM / ERP Style Table)
const SubformInput = ({ field, value, onChange, formData }) => {
  const rows = Array.isArray(value) ? value : [];
  const columns = field.subformFields || [];

  const handleAddRow = () => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.name] = ''; // Initialize with empty values
    });
    onChange(field.name, [...rows, newRow]);
  };

  const handleRemoveRow = (idx) => {
    const newRows = [...rows];
    newRows.splice(idx, 1);
    onChange(field.name, newRows);
  };

  const handleCellChange = (rowIndex, colName, colValue) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [colName]: colValue };
    onChange(field.name, newRows);
  };

  return (
    <div className="form-group subform-root" style={{ gridColumn: '1 / -1', marginBottom: '1.5rem' }}>
      <style>{`
        .subform-root .subform-field-wrapper label.form-label { display: none !important; }
        .subform-root .subform-field-wrapper .form-group { margin-bottom: 0 !important; }
        .subform-row-line { transition: background-color 0.15s ease; border-bottom: 1px solid #f1f5f9; }
        .subform-row-line:last-child { border-bottom: none; }
        .subform-row-line:hover { background-color: #fafbfc; }
        
        /* Crisp white inputs inside subform */
        .subform-root input.form-input,
        .subform-root .phone-input-group {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
        }
        .subform-root input.form-input:focus,
        .subform-root .phone-input-group:focus-within {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
        }

        /* Error States (Zoho style red border) */
        .subform-cell-has-error input.form-input,
        .subform-cell-has-error .phone-input-group {
          border-color: #ef4444 !important;
          background-color: #fffbfa !important;
        }
        .subform-cell-has-error input.form-input:focus,
        .subform-cell-has-error .phone-input-group:focus-within {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
        }
      `}</style>

      {/* Subform Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <label className="form-label" style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="21"></line>
          </svg>
          {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      </div>

      {/* Subform Grid Container */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>

        {/* Table Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0.65rem 1rem', gap: '0.75rem' }}>
          {columns.map(col => {
            const cType = (col.type || '').toLowerCase();
            const isCellPhone = cType === 'phone' || ['phone', 'primarycontact', 'alternatephone'].includes(col.name.toLowerCase());
            return (
              <div
                key={col.name}
                style={{
                  flex: isCellPhone ? '1.5' : '1.2',
                  minWidth: isCellPhone ? '200px' : '130px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569'
                }}
              >
                {col.label} {col.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
              </div>
            );
          })}
          {/* Action Header Placeholder (Right end) */}
          <div style={{ width: '32px', flexShrink: 0 }}></div>
        </div>

        {/* Table Rows */}
        {rows.map((row, idx) => (
          <div key={idx} className="subform-row-line" style={{ display: 'flex', alignItems: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem' }}>
            {/* Cells */}
            {columns.map(col => {
              const cellVal = row[col.name];
              const cType = (col.type || '').toLowerCase();
              const isCellPhone = cType === 'phone' || ['phone', 'primarycontact', 'alternatephone'].includes(col.name.toLowerCase());
              const isCellEmail = cType === 'email';
              let cellError = null;

              if (cellVal && isCellPhone) {
                const parts = String(cellVal).trim().split(' ');
                const pureNumber = parts.length > 1 ? parts.slice(1).join('').replace(/\D/g, '') : String(cellVal).replace(/\D/g, '');
                if (pureNumber.length !== 10) {
                  cellError = 'Must be 10 digits';
                }
              } else if (cellVal && isCellEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(cellVal))) {
                cellError = 'Invalid email';
              }

              return (
                <div
                  key={col.name}
                  className={`subform-field-wrapper ${cellError ? 'subform-cell-has-error' : ''}`}
                  style={{
                    flex: isCellPhone ? '1.5' : '1.2',
                    minWidth: isCellPhone ? '200px' : '130px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <DynamicField
                    field={{ ...col, label: '' }}
                    value={cellVal}
                    formData={{ ...formData, ...row }}
                    error={cellError}
                    onChange={(name, val) => handleCellChange(idx, name, val)}
                  />
                </div>
              );
            })}

            {/* Inline Delete Button (Right side) */}
            <div style={{ width: '32px', flexShrink: 0, paddingTop: '8px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleRemoveRow(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Remove Row"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {rows.length === 0 && (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', backgroundColor: '#fafafa' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>No {field.label ? field.label.toLowerCase() : 'items'} added yet</p>
          </div>
        )}
      </div>

      {/* Add New Row Button */}
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          onClick={handleAddRow}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#2563eb',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: 'none',
            padding: '0.4rem 0.6rem',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New {field.label ? field.label.replace(/s$/, '') : 'Row'}
        </button>
      </div>
    </div>
  );
};

// --- NAYA ADD KIYA: ADDRESS BLOCK COMPONENT ---
const AddressInput = ({ field, value, onChange, formData }) => {
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  let address = { street: '', city: '', state: '', country: 'India', zip: '' };
  try {
    if (typeof value === 'string' && value.startsWith('{')) {
      address = JSON.parse(value);
    } else if (value && typeof value === 'object') {
      address = value;
    }
  } catch (e) { }

  const handleChange = (key, val) => {
    let newAddress = { ...address, [key]: val };

    // --- Pincode Auto-fill Logic ---
    if (key === 'zip') {
      if (val.length === 6) {
        fetch('/pincodes.json')
          .then(res => res.json())
          .then(pincodeData => {
            if (pincodeData[val]) {
              newAddress.city = pincodeData[val].c;
              newAddress.state = pincodeData[val].s;
              newAddress.country = 'India';
              setIsAutoFilled(true);
              onChange(field.name, JSON.stringify(newAddress));
            } else {
              newAddress.city = '';
              newAddress.state = '';
              setIsAutoFilled(false);
              onChange(field.name, JSON.stringify(newAddress));
            }
          })
          .catch(err => console.error("Pincode load error", err));
        return;
      } else {
        newAddress.city = '';
        newAddress.state = '';
        setIsAutoFilled(false);
      }
    }

    onChange(field.name, JSON.stringify(newAddress));
  };

  const handleCopyBilling = (e) => {
    if (e.target.checked && formData?.billingAddress) {
      let billing = formData.billingAddress;
      if (typeof billing === 'string' && billing.startsWith('{')) {
        try {
          onChange(field.name, billing);
        } catch (err) { }
      }
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem', gridColumn: '1 / -1' }}>
      <label className="form-label">{field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}</label>

      <div style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>

        {/* Row 1: Pincode, City, State */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Pincode (6 digits)"
            maxLength={6}
            value={address.zip || ''}
            onChange={(e) => handleChange('zip', e.target.value.replace(/\D/g, ''))}
            className="form-input"
            style={{ flex: 1, minWidth: '80px' }}
          />

          <input type="text" placeholder="City" value={address.city || ''} onChange={(e) => handleChange('city', e.target.value)} className="form-input" style={{ flex: 1.5, backgroundColor: isAutoFilled ? '#f1f5f9' : '#fff' }} readOnly={isAutoFilled} />
          <input type="text" placeholder="State" value={address.state || ''} onChange={(e) => handleChange('state', e.target.value)} className="form-input" style={{ flex: 1.5, backgroundColor: isAutoFilled ? '#f1f5f9' : '#fff' }} readOnly={isAutoFilled} />
        </div>

        {/* Row 2: Street Address */}
        <input type="text" placeholder="Street Address (Building, Area, Landmark)" value={address.street || ''} onChange={(e) => handleChange('street', e.target.value)} className="form-input" style={{ width: '100%' }} />

        {/* Row 3: Country & Checkbox */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <select
            value={address.country || 'India'}
            onChange={(e) => handleChange('country', e.target.value)}
            className="form-input"
            style={{ width: '150px', backgroundColor: isAutoFilled ? '#f1f5f9' : '#fff', pointerEvents: isAutoFilled ? 'none' : 'auto' }}
          >
            {countries.map(c => (
              <option key={c.code} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>

          {field.name === 'shippingAddress' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" onChange={handleCopyBilling} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              Copy from Billing
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------


// --- GEOLOCATION / GPS CHECK-IN FIELD (Zero-Cost, Tamper-Proof) ---
const GeolocationInput = ({ field, value, onChange }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  let geoData = null;
  try {
    if (typeof value === 'string' && value.startsWith('{')) {
      geoData = JSON.parse(value);
    } else if (value && typeof value === 'object') {
      geoData = value;
    }
  } catch (e) { }

  const handleCapture = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Aapke device/browser me GPS support nahi hai.");
      return;
    }

    setIsCapturing(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);
        const timestamp = new Date().toISOString();

        let address = `Coordinates: ${lat}, ${lng}`;

        // Free OpenStreetMap Reverse Geocode (Fail-Safe)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            signal: controller.signal,
            headers: { 'Accept-Language': 'en' }
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) address = data.display_name;
          }
        } catch (err) {
          console.warn("Geocoding fallback to coordinates", err);
        }

        const resultObj = { lat, lng, accuracy, address, timestamp };
        onChange(field.name, JSON.stringify(resultObj));
        setIsCapturing(false);
      },
      (err) => {
        setIsCapturing(false);
        if (err.code === 1) {
          setErrorMsg("Location permission denied. Please allow location access in your browser.");
        } else if (err.code === 2) {
          setErrorMsg("GPS signal weak ya unavailable hai.");
        } else {
          setErrorMsg("Location capture timeout ho gaya. Dubara koshish karein.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>📍 {field.label}</span>
        {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      {geoData ? (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ backgroundColor: '#22c55e', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>
              <span style={{ fontWeight: 600, color: '#15803d', fontSize: '0.85rem' }}>Location Verified (±{geoData.accuracy}m)</span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${geoData.lat},${geoData.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
            >
              View on Google Maps ↗
            </a>
          </div>

          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: '1.4' }}>
            {geoData.address}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #dcfce7', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Captured: {new Date(geoData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing}
              style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              {isCapturing ? 'Updating...' : '🔄 Re-Capture GPS'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={handleCapture}
            disabled={isCapturing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', backgroundColor: '#0f172a',
              color: '#ffffff', border: 'none', borderRadius: '8px',
              fontSize: '0.85rem', fontWeight: 600, cursor: isCapturing ? 'wait' : 'pointer'
            }}
          >
            {isCapturing ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="16"></circle></svg>
                Capturing Satellite GPS...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Check-in / Capture Location
              </>
            )}
          </button>
          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 500 }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
};





// The Main Registry Mapping
const registry = {
  text: TextInput,
  number: NumberInput,
  decimal: DecimalInput, // NAYA
  email: TextInput,     // NAYA ADD KIYA
  phone: TextInput,     // NAYA ADD KIYA
  url: TextInput,       // NAYA ADD KIYA
  user: UserInput,    // NAYA ADD KIYA (Abhi ke liye User ko dropdown bana rahe hain)
  currency: CurrencyInput,
  select: SelectInput,
  radio: RadioInput,   // NAYA
  date: DateInput,
  datetime: DateInput,  // NAYA ADD KIYA
  checkbox: CheckboxInput,
  textarea: TextareaInput,
  lookup: LookupInput,
  image: ImageInput,
  file: FileUploadInput, // NAYA
  autonumber: AutonumberInput, // NAYA
  barcode: BarcodeScannerInput, // NAYA
  percentage: PercentageInput,
  address: AddressInput,
  subform: SubformInput,
  decision: DecisionBoxInput,
  audio: AudioInput,
  formula: FormulaInput,
  geolocation: GeolocationInput

};

// --- NAYA ADD KIYA: IMAGE UPLOADER COMPONENT ---
function ImageInput({ field, value, onChange }) {
  const [images, setImages] = React.useState(Array.isArray(value) ? value : []);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 4) {
      setErrorMsg('Maximum 4 images allowed!');
      return;
    }
    setErrorMsg('');
    const newImgs = [...images];
    let loaded = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > 800) { height *= 800 / width; width = 800; } // Auto-Compress Logic
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          newImgs.push(canvas.toDataURL('image/jpeg', 0.7)); // 70% Quality Compress
          loaded++;
          if (loaded === files.length) {
            setImages([...newImgs]);
            onChange(field.name, [...newImgs]);
          }
        }
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    const arr = images.filter((_, i) => i !== idx);
    setImages(arr);
    onChange(field.name, arr);
  };

  return (
    <div style={{ padding: '1rem', border: '2px dashed #cbd5e1', borderRadius: '8px' }}>
      <input type="file" multiple accept="image/*" onChange={handleFileChange} disabled={images.length >= 4} />
      {errorMsg && <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{errorMsg}</p>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
        {images.map((img, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <img src={img} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
            <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px' }}>X</button>
          </div>
        ))}
      </div>
    </div>
  );
}
// -----------------------------------------------
// Renders a sleek iPhone-style Toggle Switch
function DecisionBoxInput({ field, value, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label className="form-label" style={{ marginBottom: 0, fontWeight: 500 }} htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.name, e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: value ? '#3b82f6' : '#cbd5e1', transition: '.4s', borderRadius: '34px'
        }}>
          <span style={{
            position: 'absolute', content: '""', height: '20px', width: '20px', left: '4px', bottom: '4px',
            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
            transform: value ? 'translateX(22px)' : 'translateX(0)'
          }}></span>
        </span>
      </label>
    </div>
  );
}

// Renders an Audio Recorder and Uploader
function AudioInput({ field, value, onChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  React.useEffect(() => {
    if (value && value !== audioUrl) {
      setAudioUrl(value);
    }
  }, [value]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        uploadAudio(audioBlob, "recorded_audio.webm");
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const uploadAudio = async (file, fileName) => {
    setIsUploading(true);
    try {
      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(file.type)}&folder=audio`);
      const { uploadUrl, fileUrl } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setAudioUrl(fileUrl);
      onChange(field.name, fileUrl);
    } catch (err) {
      console.error(err);
      alert("Audio upload failed.");
    }
    setIsUploading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadAudio(file, file.name);
  };

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '52px' }}>
        {isRecording ? (
          <Button type="button" variant="outline" onClick={stopRecording} style={{ height: '52px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            ⏹ Stop Recording...
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={startRecording} style={{ height: '52px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            🎙️ Record Voice
          </Button>
        )}

        <label style={{ cursor: 'pointer', margin: 0, display: 'inline-block', height: '52px' }}>
          <Button type="button" variant="outline" onClick={() => document.getElementById(`audio-upload-${field.name}`).click()} disabled={isUploading || isRecording} style={{ height: '52px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            📁 Upload Audio
          </Button>
          <input id={`audio-upload-${field.name}`} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading || isRecording} />
        </label>

        {isUploading && <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Uploading... ⏳</span>}
      </div>

      {(audioUrl || value) && (
        <div style={{ marginTop: '1rem' }}>
          <audio controls src={audioUrl || value} style={{ width: '100%', height: '40px' }} />
        </div>
      )}
    </div>
  );
};

// Renders a Formula Field that calculates values dynamically based on formData
function FormulaInput({ field, value, onChange, formData }) {
  const [calculatedValue, setCalculatedValue] = useState(value || '');

  React.useEffect(() => {
    if (!field.formulaExpression) return;
    try {
      const variables = {};
      const regex = /{([^}]+)}/g;
      let match;
      let expression = field.formulaExpression;

      while ((match = regex.exec(field.formulaExpression)) !== null) {
        const varName = match[1];
        expression = expression.replace(`{${varName}}`, varName);
        let rawVal = formData[varName];
        variables[varName] = isNaN(Number(rawVal)) ? 0 : Number(rawVal);
      }

      const result = Parser.evaluate(expression, variables);
      setCalculatedValue(result);

      if (result !== value) {
        onChange(field.name, result);
      }
    } catch (err) {
      console.warn("Formula calculation pending...");
    }
  }, [formData, field.formulaExpression]);

  return (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <input type="text" value={calculatedValue} readOnly className="form-input" style={{ backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }} placeholder="Calculated automatically..." />
    </div>
  );
};



export default function DynamicField({ field, value, onChange, onBlur, formData, error, readOnly, min }) {

  // --- CUSTOM INTERCEPTS FOR TASK MODULE ---
  const fName = (field?.name || '').toLowerCase();

  if (fName === 'repeat') {
    return (
      <div style={{ position: 'relative', opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}>
        <TaskRepeatDropdown field={field} value={value} onChange={(val) => onChange(field.name, val)} />
        {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>{error}</div>}
      </div>
    );
  }
  if (fName === 'alert') {
    return (
      <div style={{ position: 'relative', opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}>
        <TaskAlertDropdown field={field} value={value} onChange={(val) => onChange(field.name, val)} />
        {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>{error}</div>}
      </div>
    );
  }
  //

  const safeType = field.type ? field.type.toLowerCase() : 'text';
  const Component = registry[safeType];

  if (!Component) {
    return (
      <div className="text-red-500 text-sm p-2 border border-red-500 rounded">
        Unsupported field type: {field.type}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}>
      <Component
        field={field}
        value={value}
        formData={formData}
        min={min}
        onBlur={onBlur}
        onChange={(name, val, record, mappings) => onChange(name, val, record, mappings)}
      />
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
