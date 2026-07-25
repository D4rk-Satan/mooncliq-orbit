import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Allow overriding credentials specifically for Lambda, otherwise fall back to default AWS keys
const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.LAMBDA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.LAMBDA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    }
});

/**
 * Executes a custom script securely in the AWS Lambda Sandbox.
 * @param {string} code - The user's JavaScript code.
 * @param {object} context - The record data or context injected into the script.
 * @returns {Promise<object>} - Result from the script execution.
 */
export async function runScriptInLambda(code, context) {
    const params = {
        FunctionName: process.env.LAMBDA_FUNCTION_ARN,
        InvocationType: "RequestResponse", // Wait for the response
        Payload: JSON.stringify({ code, context })
    };

    try {
        const command = new InvokeCommand(params);
        const response = await lambdaClient.send(command);

        // Payload is a Uint8Array, we need to decode it
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

        console.log("Script Execution Logs:", result.logs);
        return result.result;
    } catch (error) {
        console.error("Failed to invoke Lambda:", error);
        throw error;
    }
}
