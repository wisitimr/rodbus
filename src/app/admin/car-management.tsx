"use client";

import { useState } from "react";
import { Plus, Fuel, Pencil, Check, Trash2, Car, QrCode, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { addCar, deleteCar, updateCar } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import { QRCodeSVG } from "qrcode.react";

interface CarManagementProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
}

export default function CarManagement({ cars }: CarManagementProps) {
  const { t, locale } = useT();
  const th = locale === "th";
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [defaultGas, setDefaultGas] = useState("0");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  // Edit car state
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editGasCost, setEditGasCost] = useState("");

  // QR accordion — only one open at a time
  const [expandedQrId, setExpandedQrId] = useState<string | null>(cars[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const isAnyLoading = loadingAction !== null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoadingAction("add");
    try {
      await addCar(name, licensePlate || null, parseFloat(defaultGas) || 0);
      setName("");
      setLicensePlate("");
      setDefaultGas("0");
      setShowAddForm(false);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(carId: string) {
    if (!confirm(t.confirmDeleteCar)) return;
    setLoadingAction(`delete-${carId}`);
    try {
      await deleteCar(carId);
    } finally {
      setLoadingAction(null);
    }
  }

  function startEdit(car: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }) {
    setEditingCarId(car.id);
    setEditName(car.name);
    setEditLicensePlate(car.licensePlate ?? "");
    setEditGasCost(car.defaultGasCost.toString());
  }

  function cancelEdit() {
    setEditingCarId(null);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCarId || !editName.trim()) return;
    setLoadingAction(`edit-${editingCarId}`);
    try {
      await updateCar(editingCarId, {
        name: editName,
        licensePlate: editLicensePlate || null,
        defaultGasCost: parseFloat(editGasCost) || 0,
      });
      setEditingCarId(null);
    } catch {
      // keep editing
    } finally {
      setLoadingAction(null);
    }
  }

  function handleCopy(url: string, carId: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(carId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";

  return (
    <div className="space-y-3">
      {/* Add New Car Button / Form */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t.addNewCar}
        </button>
      ) : (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-4 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">{t.addNewCar}</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.carName} <span className="text-debt">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota HiAce"
                className={inputClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.licensePlate} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. กก-1234"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.defaultGasCost} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultGas}
                onChange={(e) => setDefaultGas(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAnyLoading || !name.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t.add}
                {loadingAction === "add" && "..."}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setName(""); setLicensePlate(""); setDefaultGas("0"); setStatus("idle"); }}
                className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                {t.cancel}
              </button>
            </div>
            {status === "error" && (
              <p className="text-sm font-medium text-debt">{t.failedToSave}</p>
            )}
          </form>
        </div>
      )}

      {/* Car list */}
      {cars.map((car) => {
        const tapUrl = `${baseUrl}/api/tap?carId=${car.id}`;
        const isQrOpen = expandedQrId === car.id;
        const isEditing = editingCarId === car.id;

        return (
          <div
            key={car.id}
            className="rounded-2xl border border-border bg-card shadow-sm animate-fade-in"
          >
            {isEditing ? (
              /* Edit form */
              <div className="p-4 space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-foreground">
                  {th ? "แก้ไขรถ" : "Edit Car"}
                </h3>
                <form onSubmit={handleEditSave} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t.carName} <span className="text-debt">*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputClass}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t.licensePlate} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
                    </label>
                    <input
                      type="text"
                      value={editLicensePlate}
                      onChange={(e) => setEditLicensePlate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t.defaultGasCost} <span className="text-xs font-normal text-muted-foreground/60">({t.optional})</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editGasCost}
                      onChange={(e) => setEditGasCost(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isAnyLoading || !editName.trim()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {th ? "บันทึก" : "Save"}
                      {loadingAction === `edit-${car.id}` && "..."}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Normal display */
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-foreground">{car.name}</p>
                    {car.licensePlate && (
                      <p className="text-xs text-muted-foreground">{car.licensePlate}</p>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Fuel className="h-3 w-3" />
                    <span>&#3647;{car.defaultGasCost.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(car)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(car.id)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* QR Code toggle */}
            <button
              type="button"
              onClick={() => setExpandedQrId(isQrOpen ? null : car.id)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Code
              {isQrOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* QR Code content */}
            {isQrOpen && (
              <div className="border-t border-border px-4 pb-5 pt-4 text-center animate-fade-in">
                <div className="mx-auto rounded-xl bg-white p-3 inline-block">
                  <QRCodeSVG
                    value={tapUrl}
                    size={180}
                    level="H"
                    className="mx-auto"
                  />
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                  <code className="text-xs text-muted-foreground select-all break-all">
                    {tapUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(tapUrl, car.id)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {copiedId === car.id ? (
                      <Check className="h-3.5 w-3.5 text-settled" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {cars.length === 0 && !showAddForm && (
        <p className="text-center text-sm text-muted-foreground">{t.noCars}</p>
      )}
    </div>
  );
}
