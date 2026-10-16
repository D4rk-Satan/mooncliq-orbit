import prisma from '../lib/prisma';
import { runScriptInLambda } from '../lib/lambdaExecutor';

/**
 * Executes matching backend workflows for a specific record event.
 * 
 * @param {string} organizationId - The tenant ID
 * @param {string} moduleType - 'Lead', 'Deal', 'Account', etc.
 * @param {string} recordEvent - 'Created' or 'Edited'
 * @param {object} recordData - The full data object of the record
 */
export async function executeBackendWorkflows(organizationId, moduleType, recordEvent, recordData) {
    try {
        // Find all active workflows that match the current event

        // 1. Task-Specific Direct Automation:
        if (moduleType === 'Task' && recordData?.taskAutomation && recordData.taskAutomation !== 'None') {
            const specificWorkflow = await prisma.workflowRule.findFirst({
                where: {
                    organizationId,
                    name: recordData.taskAutomation,
                    isActive: true
                }
            });

            if (specificWorkflow && specificWorkflow.code) {
                console.log(`[Workflow Engine] Executing assigned Task Automation: ${specificWorkflow.name}`);
                runScriptInLambda(specificWorkflow.code, {
                    record: recordData,
                    event: recordEvent,
                    taskAutomation: recordData.taskAutomation
                }).catch(err => {
                    console.error(`[Workflow Engine] Error running assigned task automation ${specificWorkflow.name}:`, err);
                });
            }
        }



        // We look for 'AfterSubmit' triggers specifically for backend automation
        const workflows = await prisma.workflowRule.findMany({
            where: {
                organizationId,
                moduleType,
                isActive: true,
                triggerCategory: 'AfterSubmit',
                OR: [
                    { recordEvent },
                    { recordEvent: 'CreatedOrEdited' }
                ]
            }
        });

        if (workflows.length === 0) return;

        console.log(`[Workflow Engine] Found ${workflows.length} workflows for ${moduleType} -> ${recordEvent}`);

        // Execute them asynchronously so we don't block the API response
        workflows.forEach(async (workflow) => {
            try {
                console.log(`[Workflow Engine] Executing: ${workflow.name}`);

                const result = await runScriptInLambda(workflow.code, {
                    record: recordData,
                    event: recordEvent
                });

                console.log(`[Workflow Engine] Result for ${workflow.name}:`, result);
            } catch (err) {
                console.error(`[Workflow Engine] Error executing ${workflow.name}:`, err);
            }
        });

    } catch (error) {
        console.error("[Workflow Engine] Core Engine Error:", error);
    }
}
