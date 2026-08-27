import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import * as gameDb from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { inspectSyncPayload, normalizePlayerId } from "./gameIntegrity";
import { aiNpcService, SPECIAL_AI_NPC_MAPS } from "./aiNpcService";
import { creatorRouter } from "./creatorRouter";

const playerIdSchema = z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/, "Player ID accepts letters, numbers, underscores, and hyphens only");
const vectorClockSchema = z.record(z.string(), z.number().int().min(0).max(10_000_000));
const syncTransactionSchema = z.object({
  txId: z.string().min(8).max(96),
  actorId: z.string().min(8).max(96),
  actionType: z.string().min(3).max(96),
  payload: z.record(z.string(), z.unknown()),
  vectorClock: vectorClockSchema,
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  aiNpc: router({
    turn: publicProcedure.input(z.object({
      playerId: playerIdSchema,
      mapId: z.enum(SPECIAL_AI_NPC_MAPS),
      npcId: z.string().trim().regex(/^[a-z0-9-]+:special-ai$/i).max(96),
      message: z.string().trim().min(1).max(300),
      phase: z.enum(["day", "night"]),
      biome: z.string().trim().min(1).max(80),
      position: z.object({ x: z.number().finite().min(-500).max(500), z: z.number().finite().min(-500).max(500) }),
      localFacts: z.array(z.string().trim().min(1).max(120)).max(8),
      nearbyBlockIds: z.array(z.string().trim().min(1).max(80)).max(12),
    })).mutation(({ input }) => aiNpcService.turn(input)),
  }),

  creator: creatorRouter,

  game: router({
    openProfile: publicProcedure.input(z.object({
      playerId: playerIdSchema,
      deviceToken: z.string().min(8).max(96),
      displayName: z.string().trim().min(3).max(48),
    })).mutation(async ({ input }) => {
      const playerId = normalizePlayerId(input.playerId);
      const result = await gameDb.getOrCreateGameProfile({
        playerId,
        deviceToken: input.deviceToken,
        displayName: input.displayName,
      });
      if (!result) return { available: false as const, profile: null, created: false, bundle: null };
      const bundle = await gameDb.getGameProfileBundle(playerId);
      return { available: true as const, profile: result.profile, created: result.created, bundle };
    }),
    getProfile: publicProcedure.input(z.object({ playerId: playerIdSchema })).query(async ({ input }) => {
      const bundle = await gameDb.getGameProfileBundle(normalizePlayerId(input.playerId));
      return bundle ?? null;
    }),
    reportIntegrity: publicProcedure.input(z.object({
      playerId: playerIdSchema,
      reportId: z.string().min(8).max(256),
      quarantinedInstanceIds: z.array(z.string().min(1).max(160)).max(100),
      codes: z.array(z.string().min(1).max(64)).max(16),
    })).mutation(async ({ input }) => {
      const playerId = normalizePlayerId(input.playerId);
      const result = await gameDb.recordIntegrityLog({
        playerId,
        severity: "warning",
        code: "CLIENT_RUNTIME_INTEGRITY_SCAN",
        details: {
          reportId: input.reportId,
          quarantinedInstanceIds: input.quarantinedInstanceIds,
          codes: input.codes,
        },
      });
      return { accepted: Boolean(result) };
    }),
    sync: publicProcedure.input(z.object({
      playerId: playerIdSchema,
      payload: z.record(z.string(), z.unknown()),
      checksum: z.string().min(8).max(128),
      clientUpdatedAt: z.number().int().positive(),
      health: z.number().int().min(0).max(100),
      currency: z.number().int().min(0).max(2_000_000_000),
      lastMapId: z.string().min(3).max(128),
    })).mutation(async ({ input }) => {
      const playerId = normalizePlayerId(input.playerId);
      const inspection = inspectSyncPayload(input.payload);
      if (!inspection.accepted) {
        await gameDb.recordIntegrityLog({
          playerId,
          severity: "blocked",
          code: "SYNC_PAYLOAD_INVALID",
          details: { issues: inspection.issues.slice(0, 12) },
        });
        return { accepted: false as const, issues: inspection.issues, quarantinedInstanceIds: inspection.quarantinedInstanceIds, bundle: null };
      }
      const payload = inspection.quarantinedInstanceIds.length > 0
        ? { ...input.payload, inventory: inspection.safeInventory, quarantinedInstanceIds: inspection.quarantinedInstanceIds }
        : input.payload;
      if (inspection.quarantinedInstanceIds.length > 0) {
        await gameDb.recordIntegrityLog({
          playerId,
          severity: "warning",
          code: "SYNC_ITEMS_QUARANTINED",
          details: { issues: inspection.issues.slice(0, 12), quarantinedInstanceIds: inspection.quarantinedInstanceIds },
        });
      }
      const bundle = await gameDb.writeGameSave({
        playerId,
        payload,
        checksum: input.checksum,
        clientUpdatedAt: new Date(input.clientUpdatedAt),
        health: input.health,
        currency: input.currency,
        lastMapId: input.lastMapId,
      });
      return { accepted: Boolean(bundle), issues: inspection.issues, quarantinedInstanceIds: inspection.quarantinedInstanceIds, bundle: bundle ?? null };
    }),
    syncBatch: publicProcedure.input(z.object({
      playerId: playerIdSchema,
      clientClock: vectorClockSchema,
      transactions: z.array(syncTransactionSchema).max(100),
      checksum: z.string().min(8).max(128),
    })).mutation(async ({ input }) => {
      const playerId = normalizePlayerId(input.playerId);
      const result = await gameDb.writeGameSyncBatch({
        playerId,
        clientClock: input.clientClock,
        transactions: input.transactions,
      });
      if (!result) return { accepted: false as const, acceptedTxIds: [] as string[], rejectedTxIds: input.transactions.map(transaction => transaction.txId), serverClock: {} as Record<string, number>, syncVersion: 0 };
      if (result.rejectedTxIds.length > 0) {
        await gameDb.recordIntegrityLog({
          playerId,
          severity: "warning",
          code: "SYNC_BATCH_REJECTED_ACTION",
          details: { rejectedTxIds: result.rejectedTxIds.slice(0, 20) },
        });
      }
      return { accepted: result.rejectedTxIds.length === 0, ...result };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
