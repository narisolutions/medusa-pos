import React from "react";
import { useRegister } from "@/context/register";
import OpenRegisterDialog from "../open-register-dialog";
import CloseRegisterDialog from "../close-register-dialog";

/**
 * Coordinator for the blocking register dialogs. Mounted inside the authenticated
 * Layout (under ProtectedRoute), so reconciliation only ever surfaces in-app.
 * - Disabled feature or still loading → nothing.
 * - Stale open session from a previous business day → forced close (reconcile) first.
 * - Otherwise, when a new business day needs opening → blocking open dialog.
 * On-demand movement/close (during an open shift) are owned by the sidebar status.
 */
const RegisterDialogs: React.FC = () => {
  const { enabled, loading, needsOpenRegister, staleOpenSession } = useRegister();

  if (!enabled || loading) return null;

  if (staleOpenSession) return <CloseRegisterDialog forced />;
  if (needsOpenRegister) return <OpenRegisterDialog />;

  return null;
};

export default RegisterDialogs;
