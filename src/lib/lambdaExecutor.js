import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import vm from 'vm';
import prisma from './prisma';
import { orbitSdkSource } from './orbitSdk';

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

const sdkCode = orbitSdkSource;

/**
 * Executes a custom script securely in the AWS Lambda Sandbox or Local VM.
 */
export async function runScriptInLambda(code, context) {
  context.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  context.token = context.token || 'internal-service-token';

  const finalCode = `${sdkCode}\n\n${code}`;

  // Determine which Lambda function to use based on the event type
  const isCron = context.event === 'Scheduled';
  const targetArn = isCron 
      ? process.env.TASK_AUTOMATION_LAMBDA_ARN 
      : process.env.LAMBDA_FUNCTION_ARN;

  // LOCAL EXECUTION FALLBACK
  if (process.env.NODE_ENV !== 'production' || !targetArn) {
    console.log("[Workflow Engine] Executing locally via VM (Fallback)");
    try {
      const scriptStr = `(async () => { \n${finalCode}\n })()`;
      const sandbox = {
        context,
        record: context.record,
        event: context.event,
        console,
        fetch,
        prisma,
      };
      vm.createContext(sandbox);
      const result = await vm.runInContext(scriptStr, sandbox);
      return result;
    } catch (e) {
      console.error("Local VM Execution Error:", e);
      throw e;
    }
  }

  if (!lambdaClient) {
    throw new Error("Lambda client is not initialized.");
  }

  const params = {
    FunctionName: targetArn,
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
