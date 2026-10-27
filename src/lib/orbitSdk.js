/**
 * Mooncliq Orbit Native SDK
 * Injected automatically into Workflow Scripts & Task Automations.
 * Provides Deluge-style / Apex-style operations for CRM records, Webhooks, Stage Movement & Task Audits.
 */

export const orbitSdkSource = `
const orbit = {
  // --- 1. CORE CRUD OPERATIONS ---
  async getRecord(moduleType, id) {
    const res = await fetch(\`\${context.apiUrl}/api/records?moduleType=\${moduleType}&id=\${id}\`, {
      headers: { Authorization: \`Bearer \${context.token}\` }
    });
    if (!res.ok) throw new Error('Failed to get record');
    return res.json();
  },

  async createRecord(moduleType, data) {
    const res = await fetch(\`\${context.apiUrl}/api/records?moduleType=\${moduleType}\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create record');
    return res.json();
  },

  async updateRecord(moduleType, id, data) {
    const res = await fetch(\`\${context.apiUrl}/api/records?moduleType=\${moduleType}&id=\${id}\`, {
      method: 'PUT',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update record');
    return res.json();
  },

  async deleteRecord(moduleType, id) {
    const res = await fetch(\`\${context.apiUrl}/api/records?moduleType=\${moduleType}&id=\${id}\`, {
      method: 'DELETE',
      headers: { Authorization: \`Bearer \${context.token}\` }
    });
    if (!res.ok) throw new Error('Failed to delete record');
    return true;
  },

  // --- 2. MESSAGING & NOTIFICATIONS ---
  async sendEmail(to, subject, body) {
    const res = await fetch(\`\${context.apiUrl}/api/email/send\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });
    if (!res.ok) throw new Error('Failed to send email');
    return res.json();
  },

  async sendWhatsApp(to, { templateName = 'hello_world', textBody, type = 'template' } = {}) {
    const res = await fetch(\`\${context.apiUrl}/api/whatsapp/send\`, {
      method: 'POST',
      headers: { 
        Authorization: \`Bearer \${context.token}\`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        to,
        type: textBody ? 'text' : type,
        templateName,
        textBody
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send WhatsApp message');
    }
    return res.json();
  },

  async notifyUser(targetUser, { title, message, type = 'info', actionUrl } = {}) {
    const res = await fetch(\`\${context.apiUrl}/api/notifications\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${context.token}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: context.record?.organizationId,
        targetUser,
        title,
        message,
        type,
        actionUrl
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send in-app notification');
    }
    return res.json();
  },

  async addNote(moduleType, recordId, content) {
    const res = await fetch(\`\${context.apiUrl}/api/notes\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleType, recordId, content })
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  async aggregateRecords(moduleType, filters, operation, field) {
    const res = await fetch(\`\${context.apiUrl}/api/records/aggregate?moduleType=\${moduleType}&operation=\${operation}&field=\${field}\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    if (!res.ok) throw new Error('Failed to aggregate records');
    return res.json();
  },

  // --- 3. UNIVERSAL HTTP / WEBHOOK CALLER (Zapier Killer) ---
  http: {
    async get(url, options = {}) {
      const res = await fetch(url, {
        method: 'GET',
        headers: options.headers || {}
      });
      return res.json().catch(() => res.text());
    },
    async post(url, data = {}, options = {}) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(data)
      });
      return res.json().catch(() => res.text());
    },
    async put(url, data = {}, options = {}) {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(data)
      });
      return res.json().catch(() => res.text());
    },
    async delete(url, options = {}) {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: options.headers || {}
      });
      return res.json().catch(() => res.text());
    }
  },

  // --- 4. SAFE STAGE MOVER ---
  async moveStage(moduleType, recordId, targetStageName) {
    const res = await fetch(\`\${context.apiUrl}/api/stages/move\`, {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${context.token}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ moduleType, recordId, targetStageName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || \`Failed to move \${moduleType} to stage \${targetStageName}\`);
    }
    return res.json();
  },

  // --- 5. TASK & TARGET AUDIT HELPERS ---
  task: {
    async getMovedLeadsCount(ownerEmail, { since, until, moduleType = 'Lead' } = {}) {
      const queryParams = new URLSearchParams({
        owner: ownerEmail || context.record?.owner || '',
        moduleType,
        ...(since ? { since: new Date(since).toISOString() } : {}),
        ...(until ? { until: new Date(until).toISOString() } : {})
      });
      const res = await fetch(\`\${context.apiUrl}/api/tasks/audit-rep?\${queryParams.toString()}\`, {
        headers: { Authorization: \`Bearer \${context.token}\` }
      });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    }
  }
};
`;
