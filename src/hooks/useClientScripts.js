import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function useClientScripts({ moduleType, standardData, setStandardData, customData, setCustomData, blueprint, setBlueprint }) {
  const [clientScripts, setClientScripts] = useState([]);
  const [standardFieldStates, setStandardFieldStates] = useState({});

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

  const executeScript = (triggerEvent, targetField = null) => {
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
    let hasDataChanges = false;
    let hasBlueprintChanges = false;
    let hasStandardFieldChanges = false;

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
          }
        };

        const fn = new Function('FormAPI', script.code);
        fn(FormAPI);

      } catch (e) {
        console.error(`Client Script Error (${script.name}):`, e);
        if (e.message === "FormAPI_ValidationError") {
          blockSave = true;
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

    return !blockSave;
  };

  return { executeScript, clientScripts, standardFieldStates };
}
