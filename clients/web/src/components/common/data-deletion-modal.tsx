"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export interface DataDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataDeletionModal({ isOpen, onClose }: DataDeletionModalProps) {
  const { user, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRequest = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") {
      return;
    }

    setIsDeleting(true);
    try {
      // In production, triggers the GDPR Art 17 erasure workflow
      // and logs out the active user session.
      await new Promise((resolve) => setTimeout(resolve, 800));
      success("Your data erasure request has been submitted. Logging out...", 4000);
      onClose();
      await logout();
    } catch {
      toastError("Failed to submit data deletion request. Please contact privacy@agroloop.example.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Account & Data Deletion"
      description="GDPR Article 17 — Right to be Forgotten"
      maxWidth="md"
    >
      <div className="space-y-4">
        <Alert variant="warning" title="Irreversible Action">
          Submitting a data deletion request will permanently erase your personal profile, delivery addresses, and contact details.
        </Alert>

        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            Under our <strong>Data Minimization & Privacy Charter</strong>, once processed:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500">
            <li>Your name, email ({user?.email || "account"}), and physical address are purged from our primary database.</li>
            <li>All active login sessions and refresh tokens are immediately revoked.</li>
            <li>Historical waste audit metrics are pseudonymized to preserve regional environmental impact reporting.</li>
          </ul>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label htmlFor="confirm-delete" className="block text-xs font-bold text-slate-700">
            Type <span className="text-rose-600 font-mono">DELETE</span> to confirm:
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteRequest}
            isLoading={isDeleting}
            disabled={confirmInput.trim().toUpperCase() !== "DELETE" || isDeleting}
          >
            Permanently Erase My Data
          </Button>
        </div>
      </div>
    </Modal>
  );
}
