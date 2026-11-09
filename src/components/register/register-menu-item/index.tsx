import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowDownUp, Banknote, Lock, FileText, History, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { FitText } from "@/components/ui/fit-text";
import { useRegister } from "@/context/register";
import { useTranslation } from "@/i18n";
import { useExpectedCash } from "@/hooks/register/useExpectedCash";
import { ROUTES } from "@/router/routes";
import CashMovementDialog from "../cash-movement-dialog";
import NoSaleDialog from "../no-sale-dialog";
import CloseRegisterDialog from "../close-register-dialog";
import ReportPreviewDialog from "../report-preview-dialog";

const RegisterMenuItem: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    enabled,
    session,
    isOpen,
    canReopen,
    reopenRegister,
  } = useRegister();
  const { report, isLoading: reportLoading, isError: reportFailed } = useExpectedCash(isOpen ? session : null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [xOpen, setXOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [noSaleOpen, setNoSaleOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);

  if (!enabled) return null;

  const handleReopen = async () => {
    setReopenBusy(true);
    try {
      await reopenRegister();
      setReopenOpen(false);
    } finally {
      setReopenBusy(false);
    }
  };

  // Each chooser action closes the chooser first, then opens its own dialog.
  const choose = (open: () => void) => () => {
    setChooserOpen(false);
    open();
  };

  return (
    <SidebarMenuItem>
      <Button
        variant="ghost"
        onClick={() => setChooserOpen(true)}
        className="flex flex-col h-auto min-h-tap-xl items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md disabled:opacity-100"
      >
        <div className="relative">
          <Wallet className="size-8 text-fg-muted" />
          <span
            className={`absolute -top-1 -right-1 size-3.5 rounded-full ring-2 ring-(--color-bg-base) ${
              isOpen
                ? "bg-success"
                : canReopen
                  ? "bg-warning"
                  : "bg-fg-subtle"
            }`}
          />
        </div>
        <FitText className="w-full text-base font-medium text-fg-muted leading-tight text-center">
          {canReopen
            ? t("register.status.reopen")
            : t("register.status.label")}
        </FitText>
      </Button>

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {isOpen
                ? t("register.status.open")
                : canReopen
                  ? t("register.status.closed")
                  : t("register.status.label")}
            </DialogTitle>
            <DialogDescription>
              {t("register.status.actions_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            {isOpen && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 justify-start gap-3 text-base"
                  onClick={choose(() => setMovementOpen(true))}
                >
                  <ArrowDownUp className="size-5" />
                  {t("register.status.movement")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 justify-start gap-3 text-base"
                  onClick={choose(() => setNoSaleOpen(true))}
                >
                  <Banknote className="size-5" />
                  {t("register.no_sale.title")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 justify-start gap-3 text-base"
                  onClick={choose(() => setXOpen(true))}
                >
                  <FileText className="size-5" />
                  {t("register.status.x_report")}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={choose(() => navigate(ROUTES.registerHistory))}
            >
              <History className="size-5" />
              {t("register.status.history")}
            </Button>
            {canReopen && (
              <Button
                type="button"
                className="h-14 justify-start gap-3 text-base"
                onClick={choose(() => setReopenOpen(true))}
              >
                <RotateCcw className="size-5" />
                {t("register.status.reopen")}
              </Button>
            )}
            {isOpen && (
              <Button
                type="button"
                className="h-14 justify-start gap-3 text-base"
                onClick={choose(() => setCloseOpen(true))}
              >
                <Lock className="size-5" />
                {t("register.status.close")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("register.reopen.title")}</DialogTitle>
            <DialogDescription>
              {t("register.reopen.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={reopenBusy}
              onClick={() => setReopenOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              loading={reopenBusy}
              onClick={handleReopen}
            >
              {t("register.reopen.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NoSaleDialog open={noSaleOpen} onOpenChange={setNoSaleOpen} />
      <CashMovementDialog open={movementOpen} onOpenChange={setMovementOpen} />
      <ReportPreviewDialog
        open={xOpen}
        onOpenChange={setXOpen}
        kind="x"
        session={session}
        report={report}
        isLoading={reportLoading}
        failed={reportFailed}
      />
      <CloseRegisterDialog open={closeOpen} onOpenChange={setCloseOpen} />
    </SidebarMenuItem>
  );
};

export default RegisterMenuItem;
