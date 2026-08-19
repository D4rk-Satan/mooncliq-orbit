"use client";
import React, { createContext, useContext, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: true,
    onConfirm: () => {},
  });

  const showConfirm = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = true,
    onConfirm,
  }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isDestructive,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closeConfirm();
      },
      onCancel: closeConfirm,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        isDestructive={confirmState.isDestructive}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </ConfirmContext.Provider>
  );
};
