// File: src/utils/blueprintDefaults.js

export function getDefaultBlueprintData(mod) {
    if (mod === 'Lead') {
        return {
            stages: {
                create: [
                    { name: 'New', orderIndex: 1, color: '#ffae0bff' },
                    { name: 'Contacted', orderIndex: 2, color: '#ff8800ff' },
                    { name: 'Qualified', orderIndex: 3, color: '#886bfeff' },
                    { name: 'Close Won', orderIndex: 4, color: '#62ffb6ff' },
                    { name: 'Close Lost', orderIndex: 5, color: '#fe5757ff' },
                    { name: 'Junk', orderIndex: 6, color: '#98a9c2ff' },
                ]
            },
            fields: {
                create: [
                    // Identification Section
                    { name: 'fullName', label: 'Full Name', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 1 },
                    { name: 'companyName', label: 'Company Name', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 2 },
                    { name: 'street', label: 'Street', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 3 },
                    { name: 'city', label: 'City', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 4 },
                    { name: 'state', label: 'State', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 5 },
                    { name: 'country', label: 'Country', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 6 },
                    { name: 'zipCode', label: 'Zip Code', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 7 },

                    // Contact Section
                    { name: 'email', label: 'Email', type: 'Email', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 8 },
                    { name: 'phone', label: 'Phone', type: 'Phone', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 9 },
                    { name: 'alternatePhone', label: 'Alternate Phone', type: 'Phone', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 10 },

                    // Classification & Sales Process Section
                    { name: 'owner', label: 'Owner', type: 'User', isRequired: true, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 11 },
                    { name: 'leadSource', label: 'Lead Source', type: 'Select', options: ['Website', 'Referral', 'Campaign', 'Cold Call', 'Event', 'Other'], isRequired: false, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 12 },
                    { name: 'priority', label: 'Priority', type: 'Select', options: ['Low', 'Medium', 'High'], isRequired: false, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 13 },
                    { name: 'nextFollowUpDate', label: 'Next Follow-up Date', type: 'Date', isRequired: false, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 14 },
                    { name: 'notes', label: 'Notes', type: 'Textarea', isRequired: false, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 15 },

                    // System Fields (Hidden by default in forms, visible in preview)
                    { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 16, isHidden: true },
                    { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 17, isHidden: true },
                    { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 18, isHidden: true }
                ]
            }

        };
    } else if (mod === 'Deal') {
        return {
            stages: {
                create: [
                    { name: 'Qualification', orderIndex: 1, color: '#3b82f6' },
                    { name: 'Contacted', orderIndex: 2, color: '#eab308' },
                    { name: 'Proposal', orderIndex: 3, color: '#8b5cf6' },
                    { name: 'Negotiation', orderIndex: 4, color: '#ec4899' },
                    { name: 'Close Won', orderIndex: 5, color: '#10b981' },
                    { name: 'Close Lost', orderIndex: 6, color: '#ef4444' },
                ]
            },
            fields: {
                create: [
                    // --- 1. Identification ---
                    { name: 'dealName', label: 'Deal Name', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 1 },
                    // companyName ko Lookup banaya (targetModule 'Lead') taaki frontend autofill kar sake
                    {
                        name: 'companyName',
                        label: 'Company Name',
                        type: 'Lookup',
                        targetModule: 'Lead',
                        isRequired: true,
                        isSystemField: true,
                        sectionName: 'Identification',
                        orderIndex: 2,
                        mappings: [
                            { sourceField: 'street', targetField: 'address' },
                            { sourceField: 'email', targetField: 'email' },
                            { sourceField: 'phone', targetField: 'primaryContact' },
                            { sourceField: 'alternatePhone', targetField: 'alternatePhone' }
                        ]
                    },
                    { name: 'address', label: 'Address', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 3 },
                    { name: 'convertedFromLead', label: 'Converted From Lead', type: 'Lookup', targetModule: 'Lead', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 4 },

                    // --- 2. Contact ---
                    { name: 'email', label: 'Email', type: 'Email', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 5 },
                    { name: 'primaryContact', label: 'Primary Contact', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 6 },
                    { name: 'alternatePhone', label: 'Alternate Phone', type: 'Phone', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 7 },

                    // --- 3. Financials ---
                    { name: 'dealValue', label: 'Deal Value', type: 'Currency', isRequired: true, isSystemField: true, sectionName: 'Financials', orderIndex: 8 },
                    { name: 'probability', label: 'Probability (%)', type: 'Percentage', isRequired: false, isSystemField: true, sectionName: 'Financials', orderIndex: 9 },
                    { name: 'weightedValue', label: 'Weighted Value', type: 'Number', isRequired: false, isSystemField: true, sectionName: 'Financials', orderIndex: 10 },
                    { name: 'expectedCloseDate', label: 'Expected Close Date', type: 'Date', isRequired: true, isSystemField: true, sectionName: 'Financials', orderIndex: 11 },
                    { name: 'actualCloseDate', label: 'Actual Close Date', type: 'Date', isRequired: true, isSystemField: true, sectionName: 'Financials', orderIndex: 12 },

                    // --- 4. Sales Process ---
                    { name: 'owner', label: 'Owner', type: 'User', isRequired: true, isSystemField: true, sectionName: 'Sales Process', orderIndex: 13 },
                    { name: 'dealSource', label: 'Deal Source', type: 'Select', options: ['Website', 'Referral', 'Cold Call'], isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 14 },
                    { name: 'priority', label: 'Priority', type: 'Select', options: ['Low', 'Medium', 'High'], isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 15 },
                    { name: 'nextStep', label: 'Next Step', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 16 },
                    { name: 'nextFollowUpDate', label: 'Next Follow-up Date', type: 'Date', isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 17 },
                    { name: 'lossReason', label: 'Loss Reason', type: 'Select', options: ['Price', 'Competitor', 'No Budget'], isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 18 },
                    { name: 'products', label: 'Products', type: 'Subform', targetModule: 'Product', isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 19 },
                    { name: 'notes', label: 'Notes', type: 'Textarea', isRequired: false, isSystemField: true, sectionName: 'Sales Process', orderIndex: 20 },

                    // --- 5. System Fields ---
                    { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 21, isHidden: true },
                    { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 22, isHidden: true },
                    { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 23, isHidden: true }
                ]
            }
        };
    } else if (mod === 'Account') {
        return {
            stages: {
                create: [
                    { name: 'Active', orderIndex: 1, color: '#a7f3d0' },
                    { name: 'In-Active', orderIndex: 2, color: '#fca5a5' }
                ]
            },
            fields: {
                create: [
                    { name: 'accountName', label: 'Account Name', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 1 },
                    { name: 'industry', label: 'Industry', type: 'Select', options: ['IT Sector', 'Real Estate', 'Healthcare & Medical', 'Manufacturing', 'Distribution', 'Services', 'Insurance'], isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 2 },
                    { name: 'website', label: 'Website', type: 'URL', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 3 },
                    { name: 'email', label: 'Email', type: 'Email', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 4, isHidden: false },
                    { name: 'primaryContact', label: 'Primary Contact', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 5 },
                    { name: 'billingAddress', label: 'Billing Address', type: 'Address', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 6 },
                    { name: 'shippingAddress', label: 'Shipping Address', type: 'Address', isRequired: false, isSystemField: true, sectionName: 'Contact', orderIndex: 7 },
                    {
                        name: 'contactPerson',
                        label: 'Contact Person',
                        type: 'Subform',
                        isRequired: false,
                        isSystemField: true,
                        sectionName: 'Contact',
                        orderIndex: 8,
                        subformFields: [
                            { name: 'fullName', label: 'Full Name', type: 'text', isRequired: true },
                            { name: 'phone', label: 'Phone', type: 'phone', isRequired: false },
                            { name: 'email', label: 'Email', type: 'email', isRequired: false }
                        ]
                    },

                    { name: 'teamSize', label: 'Team Size', type: 'Number', isRequired: false, isSystemField: true, sectionName: 'Business Details', orderIndex: 9 },
                    { name: 'annualRevenue', label: 'Annual Revenue', type: 'Currency', isRequired: false, isSystemField: true, sectionName: 'Business Details', orderIndex: 10 },
                    { name: 'taxId', label: 'Tax ID / GSTIN', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Business Details', orderIndex: 11 },
                    { name: 'paymentTerms', label: 'Payment Terms', type: 'Select', options: ['Due On Receipt', 'Net 15', 'Net 30', 'Net 40', 'Net 60'], isRequired: false, isSystemField: true, sectionName: 'Business Details', orderIndex: 12 },
                    { name: 'status', label: 'Status', type: 'Select', options: ['Active', 'In-Active'], isRequired: true, isSystemField: true, sectionName: 'Relationship & Ownership', orderIndex: 13, isHidden: true, defaultValue: 'Active' },
                    { name: 'owner', label: 'Account Owner', type: 'User', isRequired: true, isSystemField: true, sectionName: 'Relationship & Ownership', orderIndex: 14 },
                    { name: 'parentAccount', label: 'Parent Account', type: 'Lookup', targetModule: 'Account', isRequired: false, isSystemField: true, sectionName: 'Relationship & Ownership', orderIndex: 15 },
                    { name: 'relatedDeals', label: 'Related Deals', type: 'Lookup', targetModule: 'Deal', isRequired: true, isSystemField: true, sectionName: 'Relationship & Ownership', orderIndex: 16 },
                    { name: 'relatedLeads', label: 'Related Leads', type: 'Lookup', targetModule: 'Lead', isRequired: true, isSystemField: true, sectionName: 'Relationship & Ownership', orderIndex: 17 },

                    // --- Naye & Fixed System Fields (Image ke hisaab se) ---
                    { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 18, isHidden: true },
                    { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 19, isHidden: true },
                    { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 20, isHidden: true },
                    { name: 'totalDealValueWon', label: 'Total Deal Value (Won)', type: 'Currency', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 21, isHidden: true },
                    { name: 'openDealValue', label: 'Open Deal Value', type: 'Currency', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 22, isHidden: true }

                ]

            }
        };

    } else if (mod === 'Task') {
        return {
            stages: {
                create: [
                    { name: 'Pending', orderIndex: 1, color: '#fde68a' },
                    { name: 'Overdue', orderIndex: 2, color: '#fca5a5' },
                    { name: 'Completed', orderIndex: 3, color: '#a7f3d0' }
                ]
            },
            fields: {
                create: [
                    // ----------------- IDENTIFICATION -----------------
                    { name: 'taskName', label: 'Task Title', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 1 },
                    { name: 'priority', label: 'Priority', type: 'Select', options: ['Low', 'Medium', 'High'], isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 2 },
                    { name: 'taskType', label: 'Task Type', type: 'Select', options: ['Call', 'Email', 'Meeting', 'To-Do', 'Follow-up'], isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 3 },
                    { name: 'notes', label: 'Notes', type: 'Textarea', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 4 },
                    { name: 'owner', label: 'Assigned To', type: 'User', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 5 },
                    { name: 'assignedBy', label: 'Assigned By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 6 },

                    // ----------------- SCHEDULING -----------------
                    { name: 'startDateTime', label: 'Start Date & Time', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'Scheduling', orderIndex: 7 },
                    { name: 'dueDateTime', label: 'Due Date & Time', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'Scheduling', orderIndex: 8 },
                    // endDateTime ko form se chhupane ke liye aage isHidden: true add kiya
                    { name: 'endDateTime', label: 'End Date & Time', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'Scheduling', orderIndex: 9, isHidden: true },
                    { name: 'alert', label: 'Alert', type: 'Select', options: ['None', '5 mins before', '15 mins before', '30 mins before', '1 hour before', 'Custom'], isRequired: false, isSystemField: true, sectionName: 'Scheduling', orderIndex: 10 },
                    { name: 'repeat', label: 'Repeat', type: 'Select', options: ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'], isRequired: false, isSystemField: true, sectionName: 'Scheduling', orderIndex: 11 },

                    // ----------------- AUTOMATION -----------------
                    { name: 'relatedModule', label: 'Related Module', type: 'Select', options: ['Lead', 'Deal', 'Account', 'Product', 'Project', 'Whatsapp'], isRequired: false, isSystemField: true, sectionName: 'Automation', orderIndex: 12 },
                    { name: 'relatedRecordId', label: 'Related Record', type: 'Lookup', isRequired: false, isSystemField: true, sectionName: 'Automation', orderIndex: 13 },
                    { name: 'taskAutomation', label: 'Task Automation', type: 'Select', options: ['None', 'Send Email', 'Send SMS', 'Update Field'], isRequired: false, isSystemField: true, sectionName: 'Automation', orderIndex: 14 },
                    // completionSource ko chhupane ke liye isHidden: true add kiya
                    { name: 'completionSource', label: 'Completion Source', type: 'Select', options: ['System-verified', 'Manually marked'], isRequired: true, isSystemField: true, sectionName: 'Automation', orderIndex: 15, isHidden: true },

                    // ----------------- SYSTEM FIELDS -----------------
                    { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 16, isHidden: true },
                    { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 17, isHidden: true },
                    { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 18, isHidden: true }
                ]
            }
        };

    } else if (mod === 'Product') {
        return {
            stages: {
                // Product me Kanban/Stages nahi hain, isliye ye empty rakhenge ya default
                create: []
            },
            fields: {
                create: [
                    // ----------------- IDENTIFICATION -----------------
                    { name: 'images', label: 'Product Image', type: 'Image', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 1 },
                    { name: 'name', label: 'Product Name', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 2 },
                    { name: 'sku', label: 'SKU', type: 'Text', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 3 },
                    { name: 'category', label: 'Category', type: 'Select', options: ['Hardware', 'Software', 'Services', 'Subscriptions', 'Other'], isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 4 },
                    { name: 'description', label: 'Description', type: 'Textarea', isRequired: false, isSystemField: true, sectionName: 'Identification', orderIndex: 5 },
                    // Status ko form me hide/disable rakhna hai jaisa image me likha tha
                    { name: 'status', label: 'Status', type: 'Select', options: ['Active', 'In-Active'], isRequired: true, isSystemField: true, sectionName: 'Identification', orderIndex: 6, isHidden: true },

                    // ----------------- PRICING -----------------
                    { name: 'unitPrice', label: 'Unit Price', type: 'Currency', isRequired: true, isSystemField: true, sectionName: 'Pricing', orderIndex: 7 },
                    { name: 'costPrice', label: 'Cost Price', type: 'Currency', isRequired: false, isSystemField: true, sectionName: 'Pricing', orderIndex: 8 },
                    { name: 'totalRevenue', label: 'Total Revenue', type: 'Currency', isRequired: true, isSystemField: true, sectionName: 'Pricing', orderIndex: 9, isHidden: true }, // Auto-calculated hoga

                    // ----------------- SYSTEM FIELDS -----------------
                    { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 10, isHidden: true },
                    { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 11, isHidden: true },
                    { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 12, isHidden: true }
                ]
            }
        };

    }

    return {};
}