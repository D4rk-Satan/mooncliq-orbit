// Placeholder file for task automation cron route
// Please paste your code here
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { runScriptInLambda } from '../../../../lib/lambdaExecutor';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // 1. Security Check (CRON Secret Verification)
        const authHeader = request.headers.get('authorization') || '';
        const cronSecretHeader = request.headers.get('x-cron-secret') || '';
        const expectedSecret = process.env.CRON_SECRET || 'mooncliq-default-cron-secret-2026';

        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
        const isAuthorized = cronSecretHeader === expectedSecret || token === expectedSecret;

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Invalid Cron Secret' }, { status: 401 });
        }

        const now = new Date();
        const results = {
            timestamp: now.toISOString(),
            tasksMarkedOverdue: 0,
            scheduledWorkflowsRun: 0,
            errors: []
        };

        // 2. Core Overdue Transition:
        // Find all incomplete tasks whose due date has passed
        const overdueCandidates = await prisma.task.findMany({
            where: {
                dueDateTime: {
                    lt: now
                },
                stage: {
                    name: {
                        notIn: ['Completed', 'Overdue']
                    }
                }
            },
            include: {
                stage: true,
                blueprint: {
                    include: {
                        stages: true
                    }
                }
            }
        });

        for (const task of overdueCandidates) {
            try {
                // Find 'Overdue' stage for this task's blueprint
                const overdueStage = task.blueprint?.stages?.find(
                    s => s.name?.toLowerCase() === 'overdue'
                );

                if (overdueStage && overdueStage.id !== task.stageId) {
                    await prisma.task.update({
                        where: { id: task.id },
                        data: {
                            stageId: overdueStage.id,
                            lastActivityDate: now
                        }
                    });
                    results.tasksMarkedOverdue += 1;
                }
            } catch (err) {
                console.error(`Error marking task ${task.id} as overdue:`, err);
                results.errors.push(`Task ${task.id}: ${err.message}`);
            }
        }

        // 3. Run Scheduled Workflows (Hourly / Daily)
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();

        const scheduledWorkflows = await prisma.workflowRule.findMany({
            where: {
                isActive: true,
                triggerCategory: 'Scheduled'
            }
        });

        for (const wf of scheduledWorkflows) {
            try {
                let shouldRun = false;

                if (wf.triggerEvent === 'Hourly') {
                    shouldRun = true;
                } else if (wf.triggerEvent === 'Daily') {
                    // Runs once daily in the 00:00 UTC window (0-15 mins)
                    if (currentHour === 0 && currentMinute < 15) {
                        shouldRun = true;
                    }
                } else {
                    // Custom / fallback run
                    shouldRun = true;
                }

                if (shouldRun && wf.code) {
                    await runScriptInLambda(wf.code, {
                        event: 'Scheduled',
                        scheduledAt: now.toISOString(),
                        workflowName: wf.name
                    });
                    results.scheduledWorkflowsRun += 1;
                }
            } catch (wfErr) {
                console.error(`Error running scheduled workflow ${wf.id}:`, wfErr);
                results.errors.push(`Workflow ${wf.name}: ${wfErr.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            ...results
        });
    } catch (error) {
        console.error('Fatal error in tasks-automation cron route:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
