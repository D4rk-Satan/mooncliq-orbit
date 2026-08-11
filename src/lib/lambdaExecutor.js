import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import vm from 'vm';

let lambdaClient = null;
try {
    lambdaClient = new LambdaClient({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
            accessKeyId: process.env.LAMBDA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'dummy',
            secretAccessKey: process.env.LAMBDA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
        }
    });
} catch (e) {
    console.warn("Could not initialize LambdaClient. Proceeding with local fallback.", e);
}

const sdkCode = `
const orbit = {
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
  async sendEmail(to, subject, body) {
    const res = await fetch(\`\${context.apiUrl}/api/email/send\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });
    if (!res.ok) throw new Error('Failed to send email');
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
  async addNote(moduleType, recordId, content) {
    const res = await fetch(\`\${context.apiUrl}/api/notes\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${context.token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleType, recordId, content })
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  }
};
`;

/**
 * Executes a custom script securely in the AWS Lambda Sandbox or Local VM.
 */
export async function runScriptInLambda(code, context) {
    context.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    context.token = context.token || 'internal-service-token';

    const finalCode = `${sdkCode}\n\n${code}`;

    // LOCAL EXECUTION FALLBACK
    if (process.env.NODE_ENV !== 'production' || !process.env.LAMBDA_FUNCTION_ARN) {
        console.log("[Workflow Engine] Executing locally via VM (Fallback)");
        try {
            const scriptStr = `(async () => { \n${finalCode}\n })()`;
            const sandbox = {
                context,
                console,
                fetch,
            };
            vm.createContext(sandbox);
            const result = await vm.runInContext(scriptStr, sandbox);
            return result;
        } catch(e) {
            console.error("Local VM Execution Error:", e);
            throw e;
        }
    }

    if (!lambdaClient) {
        throw new Error("Lambda client is not initialized.");
    }

    const params = {
        FunctionName: process.env.LAMBDA_FUNCTION_ARN,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ code: finalCode, context })
    };

    try {
        const command = new InvokeCommand(params);
        const response = await lambdaClient.send(command);
        const resultString = new TextDecoder("utf-8").decode(response.Payload);
        const result = JSON.parse(resultString);

        if (response.FunctionError) {
            console.error("Lambda Function Error:", result);
            throw new Error(`Lambda Execution Error: ${result.errorType} - ${result.errorMessage}`);
        }

        if (result.statusCode !== 200) {
            console.error("Script execution failed:", result);
            throw new Error(result.error || "Unknown execution error");
        }

        return result.result;
    } catch (error) {
        console.error("Failed to invoke Lambda:", error);
        throw error;
    }
}
