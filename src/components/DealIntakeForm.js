"use client";

import React, { useEffect, useState, useMemo } from "react";
import DynamicField from "./FieldRegistry";
import useClientScripts from "@/hooks/useClientScripts";
import FormSkeleton from "./skeletons/FormSkeleton";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function DealIntakeForm({ isOpen, onClose, onSave }) {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Standard fields (Exact as schema)
  const [standardData, setStandardData] = useState({
    dealName: "",
    companyName: "",
    address: "",
    convertedFromLead: "",
    email: "",
    primaryContact: "",
    alternatePhone: "",
    dealValue: "",
    probability: "",
    weightedValue: "",
    expectedCloseDate: "",
    actualCloseDate: "",
    owner: "",
    dealSource: "",
    priority: "",
    nextStep: "",
    nextFollowUpDate: "",
    lossReason: "",
    notes: "",
    stageId: ""
  });

  const [customData, setCustomData] = useState({});

  const { executeScript, standardFieldStates, fieldErrors, fieldReadonlyStates } = useClientScripts({
    moduleType: "Deal",
    standardData, setStandardData,
    customData, setCustomData,
    blueprint, setBlueprint
  });

  const { visibleFields, orderedSections, systemFieldNames } = useMemo(() => {
    if (!blueprint?.fields) return { visibleFields: [], orderedSections: [], systemFieldNames: [] };
    // Sirf blueprint se dynamic fields lo, hardcoded sab delete!
    const sysFields = blueprint.fields.filter(f => f.isSystemField).map(f => f.name);
    const vf = blueprint.fields.filter(
      f => !f.isHidden && !standardFieldStates?.[f.name]?.isHidden
    );
    const uniqueNames = [...new Set(vf.map(f => f.sectionName || 'General Information'))];
    const os = uniqueNames.map(name => ({ name, columns: 2 }));
    return { visibleFields: vf, orderedSections: os, systemFieldNames: sysFields };
  }, [blueprint, standardFieldStates]);

  // Derived from blueprint — no hardcoding needed
  const standardFieldsList = systemFieldNames.length > 0 ? [...systemFieldNames, 'stageId'] : [];


  const dynamicSchema = useMemo(() => {
    let schemaObj = {};
    let customDataSchema = {};

    visibleFields.forEach(field => {
      let fieldValidation = z.any().optional();
      const type = field.type?.toLowerCase();

      if (field.isRequired) {
        fieldValidation = z.any().refine(val => val !== undefined && val !== null && String(val).trim() !== '', {
          message: `${field.label} is required`
        });
      }

      if (type === 'email') {
        fieldValidation = z.string().email("Invalid email format").or(field.isRequired ? z.never() : z.literal('').or(z.undefined()));
      } else if (type === 'phone') {
        fieldValidation = z.string().regex(/^[\d\+\-\(\)\s]*$/, "Invalid phone format").or(field.isRequired ? z.never() : z.literal('').or(z.undefined()));
      } else if (type === 'url' || type === 'website') {
        fieldValidation = z.string().url("Invalid URL format").or(field.isRequired ? z.never() : z.literal('').or(z.undefined()));
      } else if (type === 'number' || type === 'currency') {
        fieldValidation = z.any().refine(val => {
          if (val === undefined || val === null || val === '') return !field.isRequired;
          return !isNaN(Number(val));
        }, { message: "Must be a valid number" });
      }

      if (standardFieldsList.includes(field.name)) {
        schemaObj[field.name] = fieldValidation;
      } else {
        customDataSchema[field.name] = fieldValidation;
      }
    });

    return z.object({
      ...schemaObj,
      customData: z.object(customDataSchema).optional()
    });
  }, [visibleFields]);

  const { control, handleSubmit, setValue, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: { ...standardData, customData: customData }
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setCurrentStep(0);
      fetchBlueprint();
    } else {
      document.body.style.overflow = "auto";
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
      const res = await fetch('/api/blueprint?moduleType=Deal', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBlueprint(data);
      setTimeout(() => executeScript("onLoad"), 0);
      if (data.stages && data.stages.length > 0) {
        setStandardData(prev => ({ ...prev, stageId: data.stages[0].id }));
      }
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
        const sourceVal = record[mapping.sourceField] ?? cData[mapping.sourceField];

        if (sourceVal !== undefined) {
          if (standardFieldsList.includes(mapping.targetField)) {
            setStandardData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
            setValue(mapping.targetField, sourceVal, { shouldValidate: true, shouldDirty: true });
          } else {
            setCustomData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
            setValue(`customData.${mapping.targetField}`, sourceVal, { shouldValidate: true, shouldDirty: true });
          }
        }
      });
    }
  };

  const handleNextOrSave = async (e) => {
    if (e) e.preventDefault();

    const section = orderedSections[currentStep];
    const sectionFields = visibleFields.filter(f => (f.sectionName || 'Custom Fields') === section.name);
    const fieldsToValidate = sectionFields.map(f => standardFieldsList.includes(f.name) ? f.name : `customData.${f.name}`);

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      if (currentStep < orderedSections.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit(async (formData) => {
          const canSave = await executeScript("onSave");
          if (!canSave) return;

          const payload = {
            ...formData,
            blueprintId: blueprint?.id
          };

          // Parse Floats properly
          if (payload.dealValue) payload.dealValue = parseFloat(payload.dealValue);
          if (payload.probability) payload.probability = parseFloat(payload.probability);
          if (payload.weightedValue) payload.weightedValue = parseFloat(payload.weightedValue);

          // Parse Dates properly
          if (payload.expectedCloseDate) payload.expectedCloseDate = new Date(payload.expectedCloseDate).toISOString();
          if (payload.actualCloseDate) payload.actualCloseDate = new Date(payload.actualCloseDate).toISOString();
          if (payload.nextFollowUpDate) payload.nextFollowUpDate = new Date(payload.nextFollowUpDate).toISOString();

          onSave(payload);

          setStandardData({
            dealName: "", companyName: "", address: "", convertedFromLead: "",
            email: "", primaryContact: "", alternatePhone: "",
            dealValue: "", probability: "", weightedValue: "", expectedCloseDate: "", actualCloseDate: "",
            owner: "", dealSource: "", priority: "", nextStep: "", nextFollowUpDate: "", lossReason: "", notes: "",
            stageId: blueprint?.stages?.[0]?.id || ""
          });
          setCustomData({});
          setCurrentStep(0);
          onClose();
        })();
      }
    }
  };

  return (
    <>
      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ width: '750px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px' }}>

        {isLoading ? (
          <div className="p-8 text-center" style={{ margin: 'auto' }}>
            <FormSkeleton />
            <p className="text-muted mt-2">Fetching Blueprint from Database</p>
          </div>
        ) : (
          <form onSubmit={handleNextOrSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="slide-header" style={{ flexShrink: 0, backgroundColor: '#ffffff', zIndex: 10, display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: orderedSections.length > 1 ? '1.5rem' : '0' }}>
                <span className="slide-eyebrow" style={{ color: 'var(--primary)', letterSpacing: '0.1em', fontWeight: 700 }}>NEW {blueprint?.moduleType?.toUpperCase() || 'DEAL'}</span>
                <button type="button" className="btn-close" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {orderedSections.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 1rem' }}>
                  {orderedSections.map((sec, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 600,
                          backgroundColor: idx < currentStep ? '#D4F870' : idx === currentStep ? '#111827' : '#ffffff',
                          color: idx < currentStep ? '#111827' : idx === currentStep ? '#ffffff' : '#94a3b8',
                          border: idx > currentStep ? '2px solid #e2e8f0' : 'none',
                          boxShadow: idx === currentStep ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                        }}>
                          {idx < currentStep ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: idx === currentStep ? 600 : 500, color: idx <= currentStep ? '#111827' : '#94a3b8' }}>
                          {sec.name}
                        </span>
                      </div>
                      {idx < orderedSections.length - 1 && (
                        <div style={{ flex: 1, height: '2px', backgroundColor: idx < currentStep ? '#D4F870' : '#e2e8f0', minWidth: '30px', margin: '0 1rem' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="slide-content" style={{ padding: '2rem 2.5rem', backgroundColor: '#ffffff', overflowY: 'auto' }}>
              {orderedSections.length > 0 && (() => {
                const section = orderedSections[currentStep];
                const sectionFields = visibleFields.filter(f => (f.sectionName || 'Custom Fields') === section.name);

                if (sectionFields.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No fields in this section</div>
                );

                return (
                  <div className="data-section" key={section.name || section.id} style={{ border: 'none', padding: 0, margin: 0, boxShadow: 'none' }}>
                    <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`, gap: '1.5rem 2rem' }}>
                      {sectionFields.map(field => {
                        const stateOverride = standardFieldStates?.[field.name];
                        const modifiedField = {
                          ...field,
                          isRequired: stateOverride?.isRequired !== undefined ? stateOverride.isRequired : field.isRequired
                        };
                        return (
                          <Controller
                            key={field.id}
                            name={field.isSystemField ? field.name : `customData.${field.name}`}
                            control={control}
                            render={({ field: controllerField, fieldState }) => (
                              <div style={{ width: '100%' }}>
                                <DynamicField
                                  formData={{ ...standardData, ...customData }}
                                  field={modifiedField}
                                  value={controllerField.value || ''}
                                  onChange={(name, val, record, mappings) => {
                                    controllerField.onChange(val);
                                    handleFieldChange(field, name, val, record, mappings);
                                  }}
                                  error={errors?.[field.name] || fieldState.error?.message}
                                  readOnly={fieldReadonlyStates?.[field.name]}
                                />
                              </div>
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="slide-footer" style={{ borderTop: '1px solid #f1f5f9', flexShrink: 0, backgroundColor: '#ffffff', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2.5rem' }}>
              {currentStep > 0 ? (
                <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} style={{ borderRadius: '12px', padding: '0.6rem 1.5rem', border: '1px solid #e2e8f0', backgroundColor: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                  Back
                </button>
              ) : (
                <button type="button" onClick={onClose} style={{ borderRadius: '12px', padding: '0.6rem 1.5rem', border: '1px solid #e2e8f0', backgroundColor: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              )}

              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                Step {currentStep + 1} of {orderedSections.length}
              </span>

              <button type="submit" style={{ borderRadius: '12px', padding: '0.6rem 1.5rem', backgroundColor: '#111827', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {currentStep === orderedSections.length - 1 ? 'Save Deal' : 'Next'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
