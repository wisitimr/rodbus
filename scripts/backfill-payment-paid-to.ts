/**
 * One-off data backfill for Payment.paidToId.
 *
 * Background: before per-creditor accounting existed, a settlement on a trip
 * where someone OTHER than the car owner fronted parking was recorded as a
 * single Payment row with no creditor. The new model treats `paidToId === null`
 * as "paid to the car owner", so the parking portion of those old payments would
 * resurface as still owed to the parking payer.
 *
 * This script finds legacy payments (paidToId === null) on trips that had a
 * separate parking payer, splits each into its gas portion (kept with the car
 * owner) and its parking portion (re-attributed to the parking payer), so
 * already-cleared parking does not reappear.
 *
 * Payments on ordinary trips (no separate parking payer) are left untouched —
 * null already resolves to the car owner, which is correct.
 *
 * Idempotent: only rows with paidToId === null are processed, and every row it
 * writes gets a non-null paidToId, so re-running is a no-op.
 *
 * Usage:
 *   npx tsx scripts/backfill-payment-paid-to.ts            # dry run (no writes)
 *   npx tsx scripts/backfill-payment-paid-to.ts --apply    # perform the backfill
 */
import { prisma, prismaTx } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const apply = process.argv.includes("--apply");

  // Authoritative gas/parking split per (debtor, trip), including shared-parking
  // redistribution — exactly how the app now attributes debt.
  const splitMap = new Map<
    string,
    { gas: number; parking: number; ownerId: string; parkingPaidById: string | null }
  >();

  const groups = await prisma.partyGroup.findMany({ select: { id: true } });
  const allStart = new Date(0);
  const farFuture = new Date(2099, 11, 31);
  for (const g of groups) {
    const debts = await calculateDebts(allStart, farFuture, g.id);
    for (const d of debts) {
      for (const b of d.breakdown) {
        splitMap.set(`${d.userId}|${b.tripId}`, {
          gas: b.gasShare,
          parking: b.parkingShare,
          ownerId: b.driver.id,
          parkingPaidById: b.parkingPaidById,
        });
      }
    }
  }

  // Legacy payments on trips that recorded a separate parking payer.
  const payments = await prisma.payment.findMany({
    where: { paidToId: null, trip: { parkingPaidById: { not: null } } },
    select: {
      id: true,
      userId: true,
      tripId: true,
      amount: true,
      note: true,
      trip: { select: { parkingPaidById: true, car: { select: { ownerId: true } } } },
    },
  });

  const updates: { id: string; amount: number; paidToId: string }[] = [];
  const inserts: {
    userId: string;
    tripId: string;
    amount: number;
    note: string | null;
    paidToId: string;
  }[] = [];

  for (const p of payments) {
    const ownerId = p.trip.car.ownerId;
    const payerId = p.trip.parkingPaidById;
    // Skip when the "payer" is actually the owner — nothing to re-attribute.
    if (!payerId || payerId === ownerId) continue;

    const split = splitMap.get(`${p.userId}|${p.tripId}`);
    const gasShare = split ? split.gas : 0;

    // Allocate the recorded amount to gas first, the remainder to the parking payer.
    const gasPaid = round2(Math.min(p.amount, gasShare));
    const parkingPaid = round2(p.amount - gasPaid);

    if (gasPaid > 0) {
      updates.push({ id: p.id, amount: gasPaid, paidToId: ownerId });
      if (parkingPaid > 0) {
        inserts.push({
          userId: p.userId,
          tripId: p.tripId,
          amount: parkingPaid,
          note: p.note,
          paidToId: payerId,
        });
      }
    } else {
      // No gas portion for this debtor (e.g. the owner clearing their own
      // parking debt) — the whole payment belongs to the parking payer.
      updates.push({ id: p.id, amount: p.amount, paidToId: payerId });
    }
  }

  console.log(`Groups scanned:            ${groups.length}`);
  console.log(`Legacy split-parking rows: ${payments.length}`);
  console.log(`Rows to update (gas):      ${updates.length}`);
  console.log(`New parking rows to add:   ${inserts.length}`);

  if (!apply) {
    console.log("\nDry run — no changes written. Re-run with --apply to commit.");
    return;
  }

  for (const u of updates) {
    await prisma.payment.update({
      where: { id: u.id },
      data: { amount: u.amount, paidToId: u.paidToId },
    });
  }
  if (inserts.length > 0) {
    // createMany goes through the WS client — the HTTP adapter rejects the
    // implicit transaction Prisma wraps batch writes in.
    await prismaTx.payment.createMany({ data: inserts });
  }

  console.log("\nBackfill applied.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
