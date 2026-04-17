import { PrismaClient } from "@prisma/client";
import { PrismaNeon, PrismaNeonHttp } from "@prisma/adapter-neon";

const databaseUrl = process.env.DATABASE_URL!;

/**
 * Primary client for reads and single-statement writes.
 * Uses Neon's HTTP driver — no WebSocket handshake on cold starts, and
 * parallel queries fan out as independent HTTP requests rather than
 * serializing on one WS connection.
 */
export const prisma = new PrismaClient({
  adapter: new PrismaNeonHttp(databaseUrl, {}),
});

/**
 * WS-backed client used only for multi-statement `$transaction([...])`
 * calls, which the HTTP driver does not support.
 */
export const prismaTx = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: databaseUrl }),
});
