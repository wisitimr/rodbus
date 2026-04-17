"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Fuel, Pencil, Check, Trash2, Car, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { addCar, deleteCar, updateCar } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import ConfirmModal from "@/components/confirm-modal";
import { QRCodeSVG } from "qrcode.react";

interface CarManagementProps {
  cars: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }[];
}

const SWIPE_THRESHOLD = 40;
const ACTION_WIDTH = 92;

export default function CarManagement({ cars }: CarManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [defaultGas, setDefaultGas] = useState("");
  const [status, setStatus] = useState<"idle" | "error">("idle");

  const prevCarIdsRef = useRef<Set<string>>(new Set(cars.map(c => c.id)));

  // Clear add form when cars prop updates (new car appeared)
  useEffect(() => {
    if (loadingAction === "add") {
      const newCar = cars.find(c => !prevCarIdsRef.current.has(c.id));
      if (newCar) setExpandedQrId(newCar.id);
      setLoadingAction(null);
      setShowAddForm(false);
      setName("");
      setLicensePlate("");
      setDefaultGas("");
      setStatus("idle");
    }
    prevCarIdsRef.current = new Set(cars.map(c => c.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars.length]);

  // Edit car state
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editGasCost, setEditGasCost] = useState("");

  // QR accordion — only one open at a time
  const [expandedQrId, setExpandedQrId] = useState<string | null>(cars[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Swipe state
  const [swipedCarId, setSwipedCarId] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeOffsetRef = useRef<number>(0);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const isAnyLoading = loadingAction !== null;

  // Close swipe when tapping outside
  useEffect(() => {
    if (!swipedCarId) return;
    function handleTap(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-swipe-id="${swipedCarId}"]`)) {
        setSwipedCarId(null);
      }
    }
    document.addEventListener("touchstart", handleTap);
    return () => document.removeEventListener("touchstart", handleTap);
  }, [swipedCarId]);

  function handleSwipeTouchStart(e: React.TouchEvent, carId: string) {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeOffsetRef.current = swipedCarId === carId ? -ACTION_WIDTH : 0;
  }

  function handleSwipeTouchMove(e: React.TouchEvent, cardEl: HTMLDivElement | null) {
    if (!swipeStartRef.current || !cardEl) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) return;
    const offset = Math.min(0, Math.max(-ACTION_WIDTH, swipeOffsetRef.current + dx));
    cardEl.style.transition = "none";
    cardEl.style.transform = `translateX(${offset}px)`;
  }

  function handleSwipeTouchEnd(e: React.TouchEvent, carId: string, cardEl: HTMLDivElement | null) {
    if (!swipeStartRef.current || !cardEl) return;
    const dx = e.changedTouches[0].clientX - swipeStartRef.current.x;
    const finalOffset = swipeOffsetRef.current + dx;
    cardEl.style.transition = "transform 0.2s ease-out";
    if (finalOffset < -SWIPE_THRESHOLD) {
      cardEl.style.transform = `translateX(-${ACTION_WIDTH}px)`;
      setSwipedCarId(carId);
      // Hide QR when swiping to reveal actions
      if (expandedQrId === carId) setExpandedQrId(null);
    } else {
      cardEl.style.transform = "translateX(0)";
      setSwipedCarId(null);
    }
    swipeStartRef.current = null;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoadingAction("add");
    try {
      await addCar(name, licensePlate || null, parseFloat(defaultGas) || 0);
      // Don't hide form or clear loading — wait for revalidation to re-render with new car
    } catch {
      setStatus("error");
      setLoadingAction(null);
    }
  }

  async function handleDelete(carId: string) {
    setSwipedCarId(null);
    setLoadingAction(`delete-${carId}`);
    try {
      await deleteCar(carId);
      // Don't clear loading — revalidation will re-render with updated props
    } catch {
      setLoadingAction(null);
    }
  }

  function startEdit(car: { id: string; name: string; licensePlate: string | null; defaultGasCost: number }) {
    setSwipedCarId(null);
    setShowAddForm(false);
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
      // Don't clear loading — revalidation will re-render with updated props
    } catch {
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
          onClick={() => { setShowAddForm(true); setEditingCarId(null); }}
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
                maxLength={20}
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
                placeholder="0"
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
                onClick={() => { setShowAddForm(false); setName(""); setLicensePlate(""); setDefaultGas(""); setStatus("idle"); }}
                disabled={loadingAction === "add"}
                className="flex-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
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
        const isSwiped = swipedCarId === car.id;
        const isLoading = loadingAction === `delete-${car.id}` || loadingAction === `edit-${car.id}`;

        return (
          <div
            key={car.id}
            data-swipe-id={car.id}
            className={`relative overflow-hidden rounded-2xl bg-secondary animate-fade-in transition-opacity ${isLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
          >
            {/* Action buttons behind the card */}
            <div className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-evenly">
              <button
                type="button"
                onClick={() => startEdit(car)}
                className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(car.id)}
                className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Sliding card */}
            <div
              className="relative rounded-2xl border border-border bg-card shadow-sm"
              style={{
                transform: isSwiped ? `translateX(-${ACTION_WIDTH}px)` : "translateX(0)",
                transition: "transform 0.2s ease-out",
              }}
              onTouchStart={!isEditing ? (e) => handleSwipeTouchStart(e, car.id) : undefined}
              onTouchMove={!isEditing ? (e) => handleSwipeTouchMove(e, e.currentTarget as HTMLDivElement) : undefined}
              onTouchEnd={!isEditing ? (e) => handleSwipeTouchEnd(e, car.id, e.currentTarget as HTMLDivElement) : undefined}
            >
              {isEditing ? (
                /* Edit form */
                <div className="p-4 space-y-3 animate-fade-in">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.editCar}
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
                        maxLength={20}
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
                        {t.save}
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
                <button
                  type="button"
                  onClick={() => setExpandedQrId(isQrOpen ? null : car.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
                  {isQrOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              )}

              {/* QR Code content */}
              {isQrOpen && (
                <div className="px-4 pb-5 text-center animate-fade-in">
                  <div className="mx-auto rounded-xl border-2 border-dashed border-border bg-muted p-4">
                    <QRCodeSVG
                      value={tapUrl}
                      size={200}
                      level="H"
                      className="mx-auto h-auto w-full max-w-[200px]"
                    />
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                    <code className="text-xs text-muted-foreground select-all break-all">
                      {tapUrl}
                    </code>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopy(tapUrl, car.id); }}
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
          </div>
        );
      })}

      {cars.length === 0 && !showAddForm && (
        <p className="text-center text-sm text-muted-foreground">{t.noCars}</p>
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title={t.confirmDeleteAction}
        message={t.confirmDeleteCar}
        confirmLabel={t.confirmDeleteAction}
        cancelLabel={t.cancel}
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) handleDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
