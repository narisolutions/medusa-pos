import React from "react";
import { Keyboard, Loader2, Usb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { BAUD_RATES, useScannerSettings } from "./hooks";

const ScannerSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    scanner,
    ports,
    hiddenPortCount,
    showAllPorts,
    setShowAllPorts,
    isScanning,
    portError,
    scanPorts,
    handleTransportChange,
    handlePortChange,
    handleBaudChange,
    handleIdleMsChange,
    isTesting,
    testScans,
    startTest,
    stopTest,
  } = useScannerSettings();

  const isSerial = scanner.transport === "serial";
  const selectedPort = ports.find(
    (p) => p.path === scanner.port || p.stablePath === scanner.port
  );

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          {t("settings.scanner.description")}
        </p>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h3 className="text-base font-semibold text-fg mb-3">
            {t("settings.scanner.transport_label")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleTransportChange("wedge")}
              className={`h-16 text-base font-semibold justify-start px-4 ${
                !isSerial
                  ? "bg-primary text-white shadow"
                  : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
              }`}
            >
              <Keyboard className="w-5 h-5 mr-3 shrink-0" />
              <span className="text-left">{t("settings.scanner.transport_wedge")}</span>
            </Button>
            <Button
              onClick={() => handleTransportChange("serial")}
              className={`h-16 text-base font-semibold justify-start px-4 ${
                isSerial
                  ? "bg-primary text-white shadow"
                  : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
              }`}
            >
              <Usb className="w-5 h-5 mr-3 shrink-0" />
              <span className="text-left">{t("settings.scanner.transport_serial")}</span>
            </Button>
          </div>
          <p className="text-base text-fg-muted mt-3">
            {isSerial
              ? t("settings.scanner.transport_serial_hint")
              : t("settings.scanner.transport_wedge_hint")}
          </p>
        </div>

        {isSerial && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-fg">
                  {t("settings.scanner.port_label")}
                </h3>
                <Button
                  variant="outline"
                  onClick={scanPorts}
                  disabled={isScanning}
                  className="h-11"
                >
                  {isScanning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isScanning
                    ? t("settings.scanner.scanning")
                    : t("settings.scanner.scan_ports")}
                </Button>
              </div>

              <Select
                value={scanner.port ?? ""}
                onValueChange={handlePortChange}
              >
                <SelectTrigger>
                  <span className="truncate">
                    {selectedPort
                      ? `${selectedPort.product ?? selectedPort.path}`
                      : scanner.port || t("settings.scanner.port_none")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("settings.scanner.port_none")}</SelectItem>
                  {ports.map((port) => (
                    // Prefer the by-id symlink: ttyUSB0 is enumeration-ordered
                    // and a replug can silently point the setting at nothing.
                    <SelectItem
                      key={port.path}
                      value={port.stablePath ?? port.path}
                    >
                      <div className="flex flex-col">
                        <span>{port.product ?? port.path}</span>
                        <span className="text-sm text-fg-muted">
                          {port.path} · {port.kind}
                          {port.manufacturer ? ` · ${port.manufacturer}` : ""}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {portError && (
                <p className="text-base text-red-500 mt-2">{portError}</p>
              )}
              {hiddenPortCount > 0 && !showAllPorts && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAllPorts(true)}
                  className="mt-2 h-11 px-0"
                >
                  {t("settings.scanner.show_all_ports", { count: hiddenPortCount })}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-base font-semibold text-fg mb-3">
                  {t("settings.scanner.baud_label")}
                </h3>
                <Select
                  value={String(scanner.baud)}
                  onValueChange={(value) => handleBaudChange(Number(value))}
                >
                  <SelectTrigger>
                    <span>{scanner.baud}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {BAUD_RATES.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-base font-semibold text-fg mb-3">
                  {t("settings.scanner.idle_label")}
                </h3>
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={scanner.idleMs}
                  onChange={(e) => handleIdleMsChange(Number(e.target.value) || 0)}
                />
                <p className="text-base text-fg-muted mt-2">
                  {t("settings.scanner.idle_hint")}
                </p>
              </div>
            </div>

            <div className="border-t border-theme-border pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-fg">
                  {t("settings.scanner.test_label")}
                </h3>
                <Button
                  variant={isTesting ? "destructive" : "outline"}
                  onClick={() => (isTesting ? stopTest() : startTest())}
                  disabled={!scanner.port}
                  className="h-11"
                >
                  {isTesting
                    ? t("settings.scanner.test_stop")
                    : t("settings.scanner.test_start")}
                </Button>
              </div>
              <p className="text-base text-fg-muted mb-3">
                {t("settings.scanner.test_hint")}
              </p>

              <div className="rounded-lg border border-theme-border bg-surface-muted p-4 min-h-[120px]">
                {testScans.length === 0 ? (
                  <p className="text-base text-fg-subtle">
                    {isTesting
                      ? t("settings.scanner.test_waiting")
                      : t("settings.scanner.test_idle")}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {testScans.map((scan, index) => (
                      <li key={`${scan.port}-${index}`} className="font-mono text-base">
                        <div className="text-fg break-all">{scan.text}</div>
                        <div className="text-sm text-fg-subtle">
                          {scan.bytes.length} {t("settings.scanner.test_bytes")} ·{" "}
                          {t("settings.scanner.test_terminator")}: {scan.terminatedBy}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScannerSettings;
