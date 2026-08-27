"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import DynamicIntakeForm from "@/components/DynamicIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import { useRouter } from "next/navigation";
import TableSkeleton from "../../components/skeletons/TableSkeleton";
import DynamicModuleView from "@/components/DynamicModuleView";
import EntityEditModal from "@/components/EntityEditModal";

export default function TaskPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      fetchData();
    } catch (err) {
      router.push('/sign-in');
    }
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch User Profile
      const meRes = await fetch('/api/me', { headers });
      const meData = await meRes.json();
      setCurrentUser(meData);

      const bpRes = await fetch('/api/blueprint?moduleType=Task', { headers });
      const bpData = await bpRes.json();
      setBlueprint(bpData);

      const tagsRes = await fetch('/api/tags?moduleType=Task', { headers });
      if (tagsRes.ok) setTags(await tagsRes.json());

      const res = await fetch('/api/tasks', { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask && selectedTask.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTransition = async (taskId, toStageId, customData, transitionId) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          stageId: toStageId,
          customData,
          transitionId
        })
      });
      if (res.ok) {
        const updated = await res.json();
        handleTaskUpdate(updated);
        setSelectedTask(null);
        setPendingTransition(null);
      } else {
        const err = await res.json();
        alert("Transition failed: " + err.error);
      }
    } catch (e) {
      console.error("Transition failed", e);
    }
  };

  const handleAddTask = async (newPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPayload)
      });
      if (res.ok) {
        const savedTask = await res.json();
        setTasks((prev) => [savedTask, ...prev]);
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) {
      console.error("Failed to save task", err);
      alert("Failed to create task.");
    }
  };


  return (
    <>

      <main className="dashboard-main">

        <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ margin: 'auto' }}>
              <TableSkeleton />
            </div>
          ) : (
            <DynamicModuleView
              moduleName="Task"
              records={tasks}
              blueprint={blueprint}
              supportKanban={true}
              onRecordClick={(task) => setSelectedTask(task)}
              renderHeaderActions={() => (
                <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                  + Add Task
                </button>
              )}
            />
          )}
        </div>
      </main>

      <DynamicIntakeForm
        moduleType="Task"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddTask}
      />

      <SlideOverPanel
        isOpen={!!selectedTask}
        onClose={() => {
          setSelectedTask(null);
          setPendingTransition(null);
        }}
        lead={selectedTask}
        blueprint={blueprint}
        tags={tags}
        currentUser={currentUser}
        onTransition={handleTransition}
        onLeadUpdate={handleTaskUpdate}
        pendingTransition={pendingTransition}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <EntityEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entity={selectedTask}
        blueprint={blueprint}
        onUpdate={handleTaskUpdate}
        currentUser={currentUser}
        moduleName="Tasks"
      />

    </>
  );
}
