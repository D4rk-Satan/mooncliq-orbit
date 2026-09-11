import prisma from '../../../../lib/prisma';
import { runScriptInLambda } from '../../../../lib/lambdaExecutor';
import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        // SECURITY: Validate that this request is actually coming from AWS EventBridge
        // You should check a secret token in the headers in production.
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
            // Uncomment in production:
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all active scheduled workflows
        const workflows = await prisma.workflowRule.findMany({
            where: {
                isActive: true,
                triggerCategory: 'Scheduled'
            }
        });

        if (workflows.length === 0) {
            return NextResponse.json({ message: 'No scheduled workflows to run' });
        }

        const now = new Date();
        const results = [];

        // In a production SaaS, you would use a library like 'cron-parser' 
        // to evaluate "Custom" cron strings (e.g. '0 18 * * *') against 'now'.
        
        for (const workflow of workflows) {
            let shouldRun = false;

            switch (workflow.triggerEvent) {
                case 'Hourly':
                    // If EventBridge pings this exactly hourly, we just run it.
                    shouldRun = true; 
                    break;
                case 'Daily':
                    // If EventBridge pings hourly, only run if it's currently Midnight (00:xx)
                    if (now.getHours() === 0) shouldRun = true;
                    break;
                case 'SpecificDateTime':
                    // Check if the target date matches today and the hour matches
                    if (workflow.targetFields && workflow.targetFields[0]) {
                        const targetDate = new Date(workflow.targetFields[0]);
                        if (
                            targetDate.getFullYear() === now.getFullYear() &&
                            targetDate.getMonth() === now.getMonth() &&
                            targetDate.getDate() === now.getDate() &&
                            targetDate.getHours() === now.getHours()
                        ) {
                            shouldRun = true;
                        }
                    }
                    break;
                case 'Custom':
                    // Fallback for custom cron if pinged directly, or integrate cron-parser here
                    console.log("Custom Cron evaluation requires 'cron-parser' library.");
                    shouldRun = true; // Running for testing purposes
                    break;
            }

            if (shouldRun) {
                console.log(`[Cron Engine] Executing scheduled workflow: ${workflow.name}`);
                try {
                    // Execute the script securely via our Lambda Executor
                    const result = await runScriptInLambda(workflow.code, { 
                        event: 'Scheduled',
                        timestamp: now.toISOString()
                    });
                    results.push({ name: workflow.name, status: 'success', result });
                } catch (err) {
                    console.error(`[Cron Engine] Error executing ${workflow.name}:`, err);
                    results.push({ name: workflow.name, status: 'failed', error: err.message });
                }
            }
        }

        return NextResponse.json({ executed: results.length, details: results });
    } catch (error) {
        console.error("Cron Execution Error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
