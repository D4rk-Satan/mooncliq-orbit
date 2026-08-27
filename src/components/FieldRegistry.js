import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';

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

// Renders a simple text input
// Renders a smart text input (supports Email, Phone, URL validations)
const TextInput = ({ field, value, onChange }) => {
  // Field type ke hisaab se HTML input type decide karo
  let inputType = 'text';
  const fType = (field.type || '').toLowerCase();

  if (fType === 'email') inputType = 'email';
  if (fType === 'image') return <ImageUploadInput field={field} value={value} onChange={onChange} />;
  if (fType === 'phone') inputType = 'tel';
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
        onChange={(e) => onChange(field.name, e.target.value)}
        className="form-input"
        placeholder={`Enter ${field.label.toLowerCase()}`}
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
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? "Loading users..." : `Select ${field.label}`}
        </option>
        {users.map((u) => (
          <option key={u.email} value={u.email}>
            {u.email}
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
      onChange={(e) => onChange(field.name, Number(e.target.value))}
      className="form-input"
      placeholder={`0`}
    />
  </div>
);

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
const DateInput = ({ field, value, onChange }) => (
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
        onChange={(e) => onChange(field.name, Number(e.target.value))}
        className="form-input"
        style={{ paddingLeft: '1.75rem' }}
        placeholder={`0.00`}
        step="0.01"
      />
    </div>
  </div>
);

import LookupInput from './LookupInput';

// Renders a Subform (One-to-Many grid)
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
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#f8fafc' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(col => (
                <th key={col.name} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>
                  {col.label} {col.isRequired && <span className="text-red-500">*</span>}
                </th>
              ))}
              <th style={{ padding: '0.75rem', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                {columns.map(col => (
                  <td key={col.name} style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                    <div style={{ margin: 0, padding: 0 }}>
                      <DynamicField
                        field={{ ...col, label: '' }} // Hide individual labels inside table
                        value={row[col.name]}
                        formData={{ ...formData, ...row }} // Pass row context to allow intra-row lookups if needed
                        onChange={(name, val) => handleCellChange(idx, name, val)}
                      />
                    </div>
                  </td>
                ))}
                <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'center' }}>
                  <button type="button" onClick={() => handleRemoveRow(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}>✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No items added yet. Click "Add Row" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: '0.75rem', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={handleAddRow} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

// --- NAYA ADD KIYA: ADDRESS BLOCK COMPONENT ---
const AddressInput = ({ field, value, onChange, formData }) => {
  let address = { street: '', city: '', state: '', country: '', zip: '' };
  try {
    if (typeof value === 'string' && value.startsWith('{')) {
      address = JSON.parse(value);
    } else if (value && typeof value === 'object') {
      address = value;
    }
  } catch (e) { }

  const handleChange = (key, val) => {
    const newAddress = { ...address, [key]: val };
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
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label">{field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}</label>

      <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>

        {/* Magic Checkbox: Sirf Shipping Address wale field me dikhega */}
        {field.name === 'shippingAddress' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#0f172a', fontWeight: 500, marginBottom: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" onChange={handleCopyBilling} style={{ cursor: 'pointer' }} />
            Copy from Billing Address
          </label>
        )}

        <input type="text" placeholder="Street" value={address.street || ''} onChange={(e) => handleChange('street', e.target.value)} className="form-control" style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input type="text" placeholder="City" value={address.city || ''} onChange={(e) => handleChange('city', e.target.value)} className="form-control" style={{ flex: 1 }} />
          <input type="text" placeholder="State" value={address.state || ''} onChange={(e) => handleChange('state', e.target.value)} className="form-control" style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input type="text" placeholder="Country" value={address.country || ''} onChange={(e) => handleChange('country', e.target.value)} className="form-control" style={{ flex: 1 }} />
          <input type="text" placeholder="Zip/Postal Code" value={address.zip || ''} onChange={(e) => handleChange('zip', e.target.value)} className="form-control" style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
};
// -----------------------------------------------


// The Main Registry Mapping
const registry = {
  text: TextInput,
  number: NumberInput,
  email: TextInput,     // NAYA ADD KIYA
  phone: TextInput,     // NAYA ADD KIYA
  url: TextInput,       // NAYA ADD KIYA
  user: UserInput,    // NAYA ADD KIYA (Abhi ke liye User ko dropdown bana rahe hain)
  currency: CurrencyInput,
  select: SelectInput,
  date: DateInput,
  datetime: DateInput,  // NAYA ADD KIYA
  checkbox: CheckboxInput,
  textarea: TextareaInput,
  lookup: LookupInput,
  image: ImageInput,
  percentage: PercentageInput,
  address: AddressInput,
  subform: SubformInput,
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


export default function DynamicField({ field, value, onChange, formData, error, readOnly }) {
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
        onChange={(name, val, record, mappings) => onChange(name, val, record, mappings)}
      />
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
