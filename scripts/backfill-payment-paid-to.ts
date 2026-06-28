/**
 * One-off data backfill for Payment.paidToId.
 *
 * Background: before per-creditor accounting existed, a settlement on a trip
 * where someone OTHER than the car owner fronted parking was recorded as a
 * single Payment row with no creditor. The new model treats `paidToId === null`
 * as "paid to the car owner", so the parking portion of those old payments would
 * resurface as still owed to the parking payer.
 *
 * This script reconciles each debtor's parking debt on split-parking trips so
 * the parking payer is credited:
 *   - Legacy rows (paidToId === null) are split into a gas portion (kept with
 *     the car owner) and a parking portion (re-attributed to the parking payer).
 *   - If a legacy row was already migrated to the owner by an interrupted run
 *     but its parking credit is missing, the missing parking credit is created.
 *
 * Convergent & idempotent: it computes the target parking credit per
 * (debtor, trip) and only writes the shortfall, so it is safe to re-run and will
 * repair a partially-applied state. All writes use the HTTP client with single
 * statements (no WebSocket / batch transaction), so it runs on plain Node.
 *
 * IMPORTANT: run this BEFORE redeploying the app with the new per-creditor
 * settle flow. Until then, owner-credited rows on split-parking trips can only
 * have come from this backfill, which is what lets it safely recover the
 * parking credit for an interrupted run.
 *
 * Usage:
 *   npx tsx scripts/backfill-payment-paid-to.ts            # dry run (no writes)
 *   npx tsx scripts/backfill-payment-paid-to.ts --apply    # perform the backfill
 */
import { prisma } from "@/lib/prisma";
import { calculateDebts } from "@/lib/cost-splitting";

const round2 = (n: number) => Math.round(n * 100) / 100;

type Credit = {
  userId: string;
  tripId: string;
  payer: string;
  owner: string;
  gasShare: number;
  parkingShare: number;
};

async function main() {
  const apply = process.argv.includes("--apply");

  // Target gas/parking split per (debtor, trip) on split-parking trips, using
  // the same attribution the app now uses (incl. shared-parking redistribution).
  const credits: Credit[] = [];
  const groups = await prisma.partyGroup.findMany({ select: { id: true } });
  const allStart = new Date(0);
  const farFuture = new Date(2099, 11, 31);
  for (const g of groups) {
    const debts = await calculateDebts(allStart, farFuture, g.id);
    for (const d of debts) {
      for (const b of d.breakdown) {
        if (b.parkingPaidById && b.parkingShare > 0) {
          credits.push({
            userId: d.userId,
            tripId: b.tripId,
            payer: b.parkingPaidById,
            owner: b.driver.id,
            gasShare: b.gasShare,
            parkingShare: b.parkingShare,
          });
        }
      }
    }
  }

  // Existing payments for the involved trips, grouped by (user, trip).
  const tripIds = [...new Set(credits.map((c) => c.tripId))];
  const payments =
    tripIds.length > 0
      ? await prisma.payment.findMany({
          where: { tripId: { in: tripIds } },
          select: { id: true, userId: true, tripId: true, amount: true, paidToId: true },
        })
      : [];
  const byKey = new Map<string, typeof payments>();
  for (const p of payments) {
    const k = `${p.userId}|${p.tripId}`;
    const list = byKey.get(k);
    if (list) list.push(p);
    else byKey.set(k, [p]);
  }

  const verbose = process.argv.includes("--verbose");

  // Snapshot of the current payment state on the involved trips, so a dry run
  // shows whether/what a prior run already wrote.
  let stateNull = 0;
  let stateOwner = 0;
  let statePayer = 0;
  let stateOther = 0;
  const ownerIds = new Set(credits.map((c) => c.owner));
  const payerIds = new Set(credits.map((c) => c.payer));
  for (const p of payments) {
    if (p.paidToId === null) stateNull++;
    else if (ownerIds.has(p.paidToId)) stateOwner++;
    else if (payerIds.has(p.paidToId)) statePayer++;
    else stateOther++;
  }

  type CreateOp = {
    userId: string;
    tripId: string;
    amount: number;
    paidToId: string;
    reason: string;
  };
  const updateOps: { id: string; amount: number; paidToId: string }[] = [];
  const createOps: CreateOp[] = [];

  for (const c of credits) {
    const rows = byKey.get(`${c.userId}|${c.tripId}`) ?? [];
    const sum = (pred: (r: (typeof rows)[number]) => boolean) =>
      round2(rows.filter(pred).reduce((s, r) => s + r.amount, 0));

    const payerPaid = sum((r) => r.paidToId === c.payer);
    if (payerPaid >= c.parkingShare) continue; // already fully credited

    const nullRows = rows.filter((r) => r.paidToId === null);

    if (nullRows.length > 0) {
      // Fresh legacy rows: split gas (owner) from parking (payer).
      for (const nr of nullRows) {
        const gasPaid = round2(Math.min(nr.amount, c.gasShare));
        const parkingPaid = round2(nr.amount - gasPaid);
        if (gasPaid > 0) {
          updateOps.push({ id: nr.id, amount: gasPaid, paidToId: c.owner });
          if (parkingPaid > 0) {
            createOps.push({ userId: c.userId, tripId: c.tripId, amount: parkingPaid, paidToId: c.payer, reason: "split-legacy" });
          }
        } else {
          // No gas portion (e.g. the owner clearing their own parking debt) —
          // the whole legacy payment belongs to the parking payer.
          updateOps.push({ id: nr.id, amount: nr.amount, paidToId: c.payer });
        }
      }
    } else {
      // No legacy row left. Recover a partially-migrated state: the gas portion
      // was already moved to the owner, but the parking credit is missing.
      const ownerPaid = sum((r) => r.paidToId === c.owner);
      if (ownerPaid >= c.gasShare) {
        const shortfall = round2(c.parkingShare - payerPaid);
        if (shortfall > 0) {
          createOps.push({ userId: c.userId, tripId: c.tripId, amount: shortfall, paidToId: c.payer, reason: "recover-missing-parking" });
        }
      }
    }
  }

  console.log(`Groups scanned:                 ${groups.length}`);
  console.log(`Split-parking debt rows:        ${credits.length}`);
  console.log(`Existing payments on trips:     ${payments.length} (null=${stateNull}, to-owner=${stateOwner}, to-payer=${statePayer}, other=${stateOther})`);
  console.log(`Legacy rows to update (gas):    ${updateOps.length}`);
  console.log(`Parking credit rows to create:  ${createOps.length}`);
  const byReason = createOps.reduce<Record<string, number>>((m, o) => {
    m[o.reason] = (m[o.reason] ?? 0) + 1;
    return m;
  }, {});
  console.log(`  by reason:                    ${JSON.stringify(byReason)}`);

  if (!apply) {
    if (verbose) {
      console.log("\nProposed parking credits:");
      for (const o of createOps) {
        const rows = byKey.get(`${o.userId}|${o.tripId}`) ?? [];
        const existing = rows
          .map((r) => `${r.paidToId === null ? "null" : r.paidToId}:${r.amount}`)
          .join(",");
        console.log(
          `  user=${o.userId} trip=${o.tripId} +${o.amount}->payer=${o.paidToId} [${o.reason}] existing=[${existing}]`
        );
      }
    }
    console.log("\nDry run — no changes written. Re-run with --apply to commit.");
    console.log("Tip: add --verbose to list every proposed row.");
    return;
  }

  for (const u of updateOps) {
    await prisma.payment.update({
      where: { id: u.id },
      data: { amount: u.amount, paidToId: u.paidToId },
    });
  }
  for (const c of createOps) {
    await prisma.payment.create({
      data: { userId: c.userId, tripId: c.tripId, amount: c.amount, paidToId: c.paidToId },
    });
  }

  console.log("\nBackfill applied.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
