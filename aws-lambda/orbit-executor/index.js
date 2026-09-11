const vm = require('vm');

/**
 * AWS Lambda Sandbox Executor for Orbit CRM
 * This function receives untrusted code from the CRM backend
 * and executes it in an isolated Node.js VM context.
 */
exports.handler = async (event) => {
    try {
        const { code, context } = event;
        
        if (!code) {
            return { statusCode: 400, error: "No code provided" };
        }

        // Global variables available to the untrusted script
        // Node 18+ includes native 'fetch' globally
        const sandbox = {
            context: context || {},
            console,
            fetch
        };
        
        // Create an isolated context
        vm.createContext(sandbox);
        
        // Wrap the code in an async IIFE to support top-level await
        const scriptStr = `(async () => { \n${code}\n })()`;
        
        // Run the script with a strict 10-second timeout to prevent infinite loops
        const result = await vm.runInContext(scriptStr, sandbox, { timeout: 10000 });
        
        return {
            statusCode: 200,
            result: result
        };
    } catch (err) {
        console.error("Execution error:", err);
        return {
            statusCode: 500,
            errorType: err.name,
            errorMessage: err.message,
            stack: err.stack
        };
    }
};
