"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";
import useClientScripts from "@/hooks/useClientScripts";
import FormSkeleton from "./skeletons/FormSkeleton";
import TaskRepeatDropdown from "./TaskRepeatDropdown";
import TaskAlertDropdown from "./TaskAlertDropdown";
import TaskStageDropdown from "./TaskStageDropdown";
import TaskUserDropdown from "./TaskUserDropdown";

export default function TaskIntakeForm({ blueprint, isOpen, onClose, onSave, taskData, standardFieldStates }) {
  const [localBlueprint, setBlueprint] = useState(blueprint || null);
  const [isLoading, setIsLoading] = useState(true);

  // Standard fields
  const [standardData, setStandardData] = useState({
    taskName: "",
    startDateTime: "",
    dueDateTime: "",
    repeat: "",
    alert: "",
    notes: "",
    owner: "",
    stageId: "",
    assignedBy: "",
    priority: "",
    relatedModule: ""
  });

  // Dynamic fields
  const [customData, setCustomData] = useState({});
  const [users, setUsers] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const { executeScript, standardFieldStates: scriptFieldStates } = useClientScripts({
    moduleType: "Task",
    standardData, setStandardData,
    customData, setCustomData,
    blueprint: localBlueprint, setBlueprint
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (!localBlueprint) fetchBlueprint();
      else setIsLoading(false);
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (taskData) {
        const initialStd = {
          taskName: "", startDateTime: "", dueDateTime: "", repeat: "", alert: "", notes: "", owner: "", stageId: "", assignedBy: "", priority: "", relatedModule: ""
        };
        const initialCustom = {};

        Object.keys(taskData).forEach(key => {
          if (["taskName", "startDateTime", "dueDateTime", "repeat", "alert", "notes", "owner", "stageId", "assignedBy", "priority", "relatedModule"].includes(key)) {
            initialStd[key] = taskData[key];
          } else if (key === "customData" && typeof taskData.customData === 'object') {
            Object.assign(initialCustom, taskData.customData);
          } else if (key !== "id" && key !== "createdAt" && key !== "updatedAt" && key !== "organizationId") {
            initialCustom[key] = taskData[key];
          }
        });

        if (initialStd.startDateTime) initialStd.startDateTime = toLocalISO(initialStd.startDateTime);
        if (initialStd.dueDateTime) initialStd.dueDateTime = toLocalISO(initialStd.dueDateTime);

        setStandardData(initialStd);
        setCustomData(initialCustom);
      } else {
        setStandardData({
          taskName: "",
          startDateTime: "",
          dueDateTime: "",
          repeat: "",
          alert: "",
          notes: "",
          owner: "",
          stageId: localBlueprint?.stages?.[0]?.id || "",
          assignedBy: currentUserEmail,
          priority: "",
          relatedModule: ""
        });
        setCustomData({});
      }
    }
  }, [isOpen, taskData, localBlueprint, currentUserEmail]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsersAndMe = async () => {
        try {
          const token = await getAuthToken();

          const meRes = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.email) setCurrentUserEmail(meData.email);
          }

          const usersRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            if (Array.isArray(usersData)) setUsers(usersData);
          }
        } catch (err) {
          console.error("Error fetching users or me:", err);
        }
      };
      fetchUsersAndMe();
    }
  }, [isOpen]);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchBlueprint = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/blueprint?moduleType=Task', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBlueprint(data);
      if (data?.stages?.length > 0) {
        setStandardData(prev => ({ ...prev, stageId: data.stages[0].id }));
      }
      setTimeout(() => executeScript("onLoad"), 0);
    } catch (err) {
      console.error("Failed to load blueprint", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleFieldChange = (field, name, value, record = null, mappings = []) => {
    if (field?.isSystemField) {
      setStandardData((prev) => ({ ...prev, [name]: value }));
    } else {
      setCustomData((prev) => ({ ...prev, [name]: value }));
    }

    setTimeout(() => executeScript("onChange", name), 0);

    if (record && mappings && mappings.length > 0) {
      mappings.forEach(mapping => {
        if (!mapping.sourceField || !mapping.targetField) return;
        let cData = {};
        try {
          cData = typeof record.customData === 'string' ? JSON.parse(record.customData || '{}') : (record.customData || {});
        } catch (e) { }
        const sourceVal = record[mapping.sourceField] || cData[mapping.sourceField];

        if (sourceVal !== undefined) {
          const standardKeys = ["firstName", "lastName", "email", "phone", "owner", "stageId", "companyName", "gstNo", "website", "address", "contactPerson", "name", "sku", "taskName", "startDateTime", "dueDateTime", "endDateTime", "repeat", "alert", "notes", "assignedBy", "priority", "relatedModule"];
          if (standardKeys.includes(mapping.targetField)) {
            setStandardData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
          } else {
            setCustomData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
          }
        }
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!standardData.taskName?.trim()) {
      alert("Task Name is mandatory.");
      return;
    }
    if (!standardData.owner) {
      alert("Assign To (Owner) is mandatory.");
      return;
    }
    if (!standardData.startDateTime) {
      alert("Start Date & Time is mandatory.");
      return;
    }
    if (!standardData.dueDateTime) {
      alert("Due Date & Time is mandatory.");
      return;
    }
    if (new Date(standardData.dueDateTime) <= new Date(standardData.startDateTime)) {
      alert("Due Date & Time must be strictly greater than Start Date & Time.");
      return;
    }

    let payloadData = { ...standardData };

    if (!payloadData.startDateTime) delete payloadData.startDateTime;
    if (!payloadData.dueDateTime) delete payloadData.dueDateTime;

    onSave({
      ...payloadData,
      customData,
      blueprintId: localBlueprint?.id
    });

    onClose();
  };

  const toLocalISO = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  return (
    <>
      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {isLoading ? (
          <div className="p-8 text-center" style={{ margin: 'auto' }}>
            <FormSkeleton />
            <p className="text-muted mt-2">Fetching Blueprint from Database</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="slide-header">
              <div>
                <span className="slide-eyebrow">NEW {localBlueprint?.moduleType?.toUpperCase() || 'TASK'}</span>
              </div>
              <button type="button" className="btn-close" onClick={onClose}>✕</button>
            </div>

            <div className="slide-content">
              {localBlueprint?.fields && (() => {
                const visibleFields = localBlueprint.fields.filter(f => !f.isHidden && !scriptFieldStates?.[f.name]?.isHidden);

                let orderedSections = [];
                if (localBlueprint?.layoutConfig && Array.isArray(localBlueprint.layoutConfig) && localBlueprint.layoutConfig.length > 0) {
                  orderedSections = [...localBlueprint.layoutConfig].sort((a, b) => a.order - b.order);
                } else {
                  const uniqueNames = [...new Set(visibleFields.map(f => f.sectionName || 'Task Information'))];
                  orderedSections = uniqueNames.map(name => ({ name, columns: 3 }));
                }

                return orderedSections.map(section => {
                  const sectionFields = visibleFields.filter(f => (f.sectionName || 'Task Information') === section.name)
                    .sort((a, b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));

                  if (sectionFields.length === 0) return null;

                  return (
                    <div className="data-section" key={section.name || section.id}>
                      <h3 className="section-heading">{section.name}</h3>
                      <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns || 3}, 1fr)`, gap: '1.5rem' }}>
                        {sectionFields.map(field => {
                          const stateOverride = standardFieldStates?.[field.name];
                          if (stateOverride?.isHidden) return null;

                          // Hide stageId upon creation
                          if (field.name === 'stageId' && !taskData) return null;

                          const alwaysRequired = ['taskName', 'owner', 'startDateTime', 'dueDateTime'];
                          const isRequiredByRule = stateOverride?.isRequired !== undefined ? stateOverride.isRequired : field.isRequired;

                          const modifiedField = {
                            ...field,
                            isRequired: alwaysRequired.includes(field.name) || isRequiredByRule
                          };

                          if (field.name === 'owner' || field.name === 'assignedBy') {
                            return (
                              <TaskUserDropdown
                                key={field.id}
                                field={modifiedField}
                                value={standardData[field.name]}
                                users={users}
                                readOnly={field.name === 'assignedBy'} // assignedBy should be read-only if we just autofill it, or just allow change? The user said "usme by default jo user log in he uska naam autofill aayega". We'll allow them to change it if they want. So readOnly={false}
                                onChange={(val) => handleFieldChange(field, field.name, val)}
                              />
                            );
                          }

                          if (field.name === 'repeat') {
                            return (
                              <TaskRepeatDropdown
                                key={field.id}
                                field={modifiedField}
                                value={standardData.repeat}
                                onChange={(val) => handleFieldChange(field, 'repeat', val)}
                              />
                            );
                          }

                          if (field.name === 'alert') {
                            return (
                              <TaskAlertDropdown
                                key={field.id}
                                field={modifiedField}
                                value={standardData.alert}
                                onChange={(val) => handleFieldChange(field, 'alert', val)}
                              />
                            );
                          }


                          if (field.name === 'stageId') {
                            return (
                              <TaskStageDropdown
                                key={field.id}
                                field={modifiedField}
                                value={standardData.stageId}
                                blueprint={localBlueprint}
                                onChange={(val) => handleFieldChange(field, 'stageId', val)}
                              />
                            );
                          }

                          return (
                            <DynamicField
                              formData={{ ...standardData, ...customData }}
                              key={field.id}
                              field={modifiedField}
                              value={field.isSystemField ? standardData[field.name] : customData[field.name]}
                              onChange={(name, value, record, mappings) => handleFieldChange(field, name, value, record, mappings)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="slide-footer" style={{ borderTop: '1px solid #e2e8f0', flexShrink: 0, backgroundColor: 'var(--card-bg)', zIndex: 10 }}>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>Save Task</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
