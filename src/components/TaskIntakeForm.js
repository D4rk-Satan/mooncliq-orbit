"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

  const { visibleFields, orderedSections } = useMemo(() => {
    if (!localBlueprint?.fields) return { visibleFields: [], orderedSections: [] };
    const vf = localBlueprint.fields.filter(f => !f.isHidden && !scriptFieldStates?.[f.name]?.isHidden);

    let os = [];
    if (localBlueprint?.layoutConfig && Array.isArray(localBlueprint.layoutConfig) && localBlueprint.layoutConfig.length > 0) {
      os = [...localBlueprint.layoutConfig].sort((a, b) => a.order - b.order);
    } else {
      const uniqueNames = [...new Set(vf.map(f => f.sectionName || 'Task Information'))];
      os = uniqueNames.map(name => ({ name, columns: 3 }));
    }
    return { visibleFields: vf, orderedSections: os };
  }, [localBlueprint, scriptFieldStates]);

  const standardFields = [
    "taskName", "startDateTime", "dueDateTime", "repeat", "alert", "notes", "owner", "stageId", "assignedBy", "priority", "relatedModule"
  ];

  const dynamicSchema = useMemo(() => {
    let schemaObj = {};
    let customDataSchema = {};

    visibleFields.forEach(field => {
      let fieldValidation = z.any().optional();
      const type = field.type?.toLowerCase();

      const alwaysRequired = ['taskName', 'owner', 'startDateTime', 'dueDateTime'];
      const stateOverride = scriptFieldStates?.[field.name];
      const isRequired = alwaysRequired.includes(field.name) || (stateOverride?.isRequired !== undefined ? stateOverride.isRequired : field.isRequired);

      if (isRequired) {
        fieldValidation = z.any().refine(val => val !== undefined && val !== null && String(val).trim() !== '', {
          message: `${field.label || field.name} is required`
        });
      }

      if (standardFields.includes(field.name)) {
        schemaObj[field.name] = fieldValidation;
      } else {
        customDataSchema[field.name] = fieldValidation;
      }
    });

    return z.object({
      ...schemaObj,
      customData: z.object(customDataSchema).optional()
    }).refine((data) => {
      if (data.startDateTime && data.dueDateTime) {
        return new Date(data.dueDateTime) > new Date(data.startDateTime);
      }
      return true;
    }, {
      message: "Due Date must be greater than Start Date",
      path: ["dueDateTime"]
    });
  }, [visibleFields, scriptFieldStates]);

  // Hook Form Initialize kar rahe hain
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: { ...standardData, customData: customData }
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
        reset({ ...initialStd, customData: initialCustom });
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
        reset({ taskName: "", startDateTime: "", dueDateTime: "", repeat: "", alert: "", notes: "", owner: "", stageId: localBlueprint?.stages?.[0]?.id || "", assignedBy: currentUserEmail, priority: "", relatedModule: "", customData: {} });

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

  const onFormSubmit = async (formData) => {
    // Client script save logic
    const canSave = await executeScript("onSave");
    if (!canSave) return;

    let payloadData = { ...formData };
    delete payloadData.customData;

    // Date safai
    if (!payloadData.startDateTime) delete payloadData.startDateTime;
    if (!payloadData.dueDateTime) delete payloadData.dueDateTime;

    onSave({
      ...payloadData,
      customData: formData.customData || {},
      blueprintId: localBlueprint?.id
    });

    onClose();
  };


  {/* let payloadData = { ...standardData };

  if (!payloadData.startDateTime) delete payloadData.startDateTime;
  if (!payloadData.dueDateTime) delete payloadData.dueDateTime;

  onSave({
    ...payloadData,
    customData,
    blueprintId: localBlueprint?.id
  });

  onClose();
};  
*/}

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

                          const fieldName = field.isSystemField ? field.name : `customData.${field.name}`;

                          return (
                            <Controller
                              key={field.id}
                              name={fieldName}
                              control={control}
                              render={({ field: controllerField }) => {
                                const commonProps = {
                                  field: modifiedField,
                                  value: controllerField.value || '',
                                  error: errors[field.name]?.message || (errors.customData && errors.customData[field.name]?.message),
                                  onChange: (val, record, mappings) => {
                                    controllerField.onChange(val);
                                    handleFieldChange(field, field.isSystemField ? field.name : field.name, val, record, mappings);
                                  }
                                };

                                console.log("Rendering Field:", field.name);
                                const fName = field.name.toLowerCase();
                                let fieldComponent = null;

                                if (fName === 'owner' || fName === 'assignedby') {
                                  fieldComponent = <TaskUserDropdown {...commonProps} users={users} readOnly={field.name === 'assignedBy'} onChange={(val) => commonProps.onChange(val)} />;
                                } else if (fName === 'repeat') {
                                  fieldComponent = <TaskRepeatDropdown {...commonProps} onChange={(val) => commonProps.onChange(val)} />;
                                } else if (fName === 'alert') {
                                  fieldComponent = <TaskAlertDropdown {...commonProps} onChange={(val) => commonProps.onChange(val)} />;
                                } else if (fName === 'stageid') {
                                  fieldComponent = <TaskStageDropdown {...commonProps} blueprint={localBlueprint} onChange={(val) => commonProps.onChange(val)} />;
                                } else {
                                  fieldComponent = (
                                    <DynamicField
                                      formData={{ ...standardData, ...customData }}
                                      {...commonProps}
                                      onChange={(name, value, record, mappings) => commonProps.onChange(value, record, mappings)}
                                    />
                                  );
                                }


                                return (
                                  <div style={{ width: '100%', position: 'relative' }}>
                                    {fieldComponent}
                                    {commonProps.error && <span style={{ color: '#ef4444', fontSize: '0.75rem', position: 'absolute', bottom: '-18px', left: '4px' }}>{commonProps.error}</span>}
                                  </div>
                                );
                              }}
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
