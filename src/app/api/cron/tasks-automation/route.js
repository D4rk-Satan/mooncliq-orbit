import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { runScriptInLambda } from '../../../../lib/lambdaExecutor';

export const dynamic = 'force-dynamic';

function appendSystemNote(existingNotes, noteText) {
    let notesArray = [];
    if (existingNotes) {
        if (Array.isArray(existingNotes)) {
            notesArray = [...existingNotes];
        } else if (typeof existingNotes === 'string') {
            try {
                const parsed = JSON.parse(existingNotes);
                if (Array.isArray(parsed)) {
                    notesArray = parsed;
                } else {
                    notesArray = [{ id: 'legacy-1', text: String(existingNotes), author: 'System Note', createdAt: new Date().toISOString() }];
                }
            } catch (e) {
                notesArray = [{ id: 'legacy-1', text: String(existingNotes), author: 'System Note', createdAt: new Date().toISOString() }];
            }
        }
    }
    notesArray.push({
        id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: noteText,
        author: 'System Automation',
        createdAt: new Date().toISOString()
    });
    return JSON.stringify(notesArray);
}

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
            tasksAutomated: 0,
            scheduledWorkflowsRun: 0,
            errors: []
        };

        // 2. Task Lifecycle Automation & Overdue Transition:
        // Find all tasks where: Due Date & Time < now AND Status != Completed AND Status != Overdue
        const candidateTasks = await prisma.task.findMany({
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

        for (const task of candidateTasks) {
            try {
                const hasRelated = Boolean(task.relatedModule && task.relatedModule.trim().toLowerCase() !== 'none');
                const hasAutomation = Boolean(task.taskAutomation && task.taskAutomation.trim().toLowerCase() !== 'none');

                // Case-2: Related Module == selected AND Task Automation == selected
                if (hasRelated && hasAutomation) {
                    const specificWorkflow = await prisma.workflowRule.findFirst({
                        where: {
                            organizationId: task.organizationId,
                            name: task.taskAutomation,
                            isActive: true
                        }
                    });

                    if (specificWorkflow && specificWorkflow.code) {
                        console.log(`[Cron Engine] Running Task Automation "${specificWorkflow.name}" for Task ${task.id}`);
                        await runScriptInLambda(specificWorkflow.code, {
                            record: task,
                            event: 'DueTimeReached',
                            taskAutomation: task.taskAutomation
                        });

                        // Re-fetch task to check if the script updated the stage
                        const updatedTask = await prisma.task.findUnique({
                            where: { id: task.id },
                            include: { stage: true }
                        });

                        // Safety Fallback: If script did NOT update the stage, auto-complete to prevent infinite loops
                        if (updatedTask && updatedTask.stageId === task.stageId) {
                            const completedStage = task.blueprint?.stages?.find(s => s.name?.toLowerCase() === 'completed');
                            if (completedStage) {
                                await prisma.task.update({
                                    where: { id: task.id },
                                    data: {
                                        stageId: completedStage.id,
                                        endDateTime: now,
                                        completionSource: 'Automatic',
                                        notes: appendSystemNote(task.notes, `✅ [Automatic Completed]: Automation "${task.taskAutomation}" executed.`)
                                    }
                                });
                            }
                        } else if (updatedTask && !updatedTask.completionSource) {
                            // If script moved stage, ensure completionSource is marked Automatic
                            await prisma.task.update({
                                where: { id: task.id },
                                data: { completionSource: 'Automatic' }
                            });
                        }

                        results.tasksAutomated += 1;
                    } else {
                        // Fallback if automation script missing: move to Overdue
                        const overdueStage = task.blueprint?.stages?.find(s => s.name?.toLowerCase() === 'overdue');
                        if (overdueStage && overdueStage.id !== task.stageId) {
                            await prisma.task.update({
                                where: { id: task.id },
                                data: {
                                    stageId: overdueStage.id,
                                    completionSource: 'Automatic',
                                    lastActivityDate: now,
                                    notes: appendSystemNote(task.notes, `⚠️ [Automatic Overdue]: Automation "${task.taskAutomation}" script not found or inactive.`)
                                }
                            });
                            results.tasksMarkedOverdue += 1;
                        }
                    }
                } 
                // Case-1 (none/none), Case-3 (selected/none), Case-4 (none/selected):
                // All move to Overdue with completionSource = 'Automatic'
                else {
                    const overdueStage = task.blueprint?.stages?.find(s => s.name?.toLowerCase() === 'overdue');
                    if (overdueStage && overdueStage.id !== task.stageId) {
                        await prisma.task.update({
                            where: { id: task.id },
                            data: {
                                stageId: overdueStage.id,
                                completionSource: 'Automatic',
                                lastActivityDate: now,
                                notes: appendSystemNote(task.notes, `⚠️ [Automatic Overdue]: Due date passed.`)
                            }
                        });
                        results.tasksMarkedOverdue += 1;
                    }
                }
            } catch (err) {
                console.error(`Error processing task ${task.id} in cron:`, err);
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
