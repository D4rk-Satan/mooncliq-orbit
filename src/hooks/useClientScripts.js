import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'react-hot-toast';

export default function useClientScripts({ moduleType, standardData, setStandardData, customData, setCustomData, blueprint, setBlueprint, currentUser }) {
  const [clientScripts, setClientScripts] = useState([]);
  const [standardFieldStates, setStandardFieldStates] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldReadonlyStates, setFieldReadonlyStates] = useState({});

  useEffect(() => {
    if (!moduleType) return;
    
    const fetchScripts = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const token = tokens.idToken.toString();
        
        const res = await fetch(`/api/client-scripts?moduleType=${moduleType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setClientScripts(data.filter(s => s.isActive));
        }
      } catch (e) {
        console.error("Failed to fetch client scripts:", e);
      }
    };
    
    fetchScripts();
  }, [moduleType]);

  const executeScript = async (triggerEvent, targetField = null) => {
    const scriptsToRun = clientScripts.filter(s => 
      s.triggerEvent === triggerEvent &&
      (triggerEvent !== 'onChange' || s.targetField === targetField)
    );

    if (scriptsToRun.length === 0) return true; // true means execution allowed (e.g. for onSave)

    let blockSave = false;

    // We use temporary state objects so multiple FormAPI calls in the same script 
    // can stack without React batching dropping them.
    let nextStandardData = { ...standardData };
    let nextCustomData = { ...customData };
    let nextBlueprint = { ...blueprint };
    let nextStandardFieldStates = { ...standardFieldStates };
    let nextFieldErrors = { ...fieldErrors };
    let nextFieldReadonlyStates = { ...fieldReadonlyStates };
    let hasDataChanges = false;
    let hasBlueprintChanges = false;
    let hasStandardFieldChanges = false;
    let hasErrorChanges = false;
    let hasReadonlyChanges = false;

    const stdFields = ["name", "sku", "firstName", "lastName", "email", "phone", "owner", "stageId", "companyName", "gstNo", "website", "address", "contactPerson", "taskName", "startDateTime", "dueDateTime", "endDateTime", "repeat", "alert", "notes"];

    for (const script of scriptsToRun) {
      try {
        const FormAPI = {
          getValue: (fieldName) => {
            if (stdFields.includes(fieldName)) return nextStandardData[fieldName];
            return nextCustomData[fieldName];
          },
          setValue: (fieldName, val) => {
            if (stdFields.includes(fieldName)) {
              nextStandardData[fieldName] = val;
            } else {
              nextCustomData[fieldName] = val;
            }
            hasDataChanges = true;
          },
          hideField: (fieldName) => {
            if (stdFields.includes(fieldName)) {
              nextStandardFieldStates[fieldName] = { ...nextStandardFieldStates[fieldName], isHidden: true };
              hasStandardFieldChanges = true;
            } else if (nextBlueprint.fields) {
              nextBlueprint.fields = nextBlueprint.fields.map(f => 
                f.name === fieldName ? { ...f, isHidden: true } : f
              );
              hasBlueprintChanges = true;
            }
          },
          showField: (fieldName) => {
            if (stdFields.includes(fieldName)) {
              nextStandardFieldStates[fieldName] = { ...nextStandardFieldStates[fieldName], isHidden: false };
              hasStandardFieldChanges = true;
            } else if (nextBlueprint.fields) {
              nextBlueprint.fields = nextBlueprint.fields.map(f => 
                f.name === fieldName ? { ...f, isHidden: false } : f
              );
              hasBlueprintChanges = true;
            }
          },
          setMandatory: (fieldName, isMandatory) => {
            if (stdFields.includes(fieldName)) {
              nextStandardFieldStates[fieldName] = { ...nextStandardFieldStates[fieldName], isRequired: isMandatory };
              hasStandardFieldChanges = true;
            } else if (nextBlueprint.fields) {
              nextBlueprint.fields = nextBlueprint.fields.map(f => 
                f.name === fieldName ? { ...f, isRequired: isMandatory } : f
              );
              hasBlueprintChanges = true;
            }
          },
          showError: (message) => {
            alert(`Validation Error: ${message}`);
            throw new Error("FormAPI_ValidationError");
          },
          showFieldError: (fieldName, message) => {
            nextFieldErrors[fieldName] = message;
            hasErrorChanges = true;
            throw new Error("FormAPI_FieldError");
          },
          setReadOnly: (fieldName, isReadOnly) => {
            nextFieldReadonlyStates[fieldName] = isReadOnly;
            hasReadonlyChanges = true;
          },
          showToast: (message, type = 'success') => {
            if (type === 'error') toast.error(message);
            else if (type === 'success') toast.success(message);
            else toast(message);
          },
          fetch: async (url, options = {}) => {
            const res = await fetch('/api/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, options })
            });
            const result = await res.json();
            if (!result.ok) throw new Error(result.error || 'Proxy fetch failed');
            return result.data;
          },
          context: {
            user: currentUser,
            moduleType,
            recordId: standardData?.id || null
          }
        };

        // If triggerEvent is onChange, clear previous field error for that field
        if (triggerEvent === 'onChange' && targetField) {
          if (nextFieldErrors[targetField]) {
            delete nextFieldErrors[targetField];
            hasErrorChanges = true;
          }
        }

        const fn = new Function('FormAPI', `return (async () => { ${script.code} })();`);
        await fn(FormAPI);

      } catch (e) {
        if (e.message === "FormAPI_ValidationError" || e.message === "FormAPI_FieldError") {
          blockSave = true;
        } else {
          console.error(`Client Script Error (${script.name}):`, e);
        }
      }
    }

    if (hasDataChanges) {
      setStandardData(nextStandardData);
      setCustomData(nextCustomData);
    }
    
    if (hasBlueprintChanges) {
      setBlueprint(nextBlueprint);
    }
    
    if (hasStandardFieldChanges) {
      setStandardFieldStates(nextStandardFieldStates);
    }
    
    if (hasErrorChanges) {
      setFieldErrors(nextFieldErrors);
    }
    
    if (hasReadonlyChanges) {
      setFieldReadonlyStates(nextFieldReadonlyStates);
    }

    return !blockSave;
  };

  return { executeScript, clientScripts, standardFieldStates, fieldErrors, fieldReadonlyStates };
}
