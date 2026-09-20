import * as SecureStore from "expo-secure-store";
import { mobileApiClient } from "../lib/api.js";

const OFFLINE_QUEUE_STORAGE_KEY = "agroloop_offline_mutations_queue";

export type MutationType =
  | "SUBMIT_WASTE"
  | "CANCEL_PICKUP"
  | "CLAIM_PICKUP"
  | "SCHEDULE_PICKUP"
  | "COLLECT_PICKUP"
  | "VERIFY_PICKUP";

export interface QueuedMutation<T = unknown> {
  id: string;
  type: MutationType;
  payload: T;
  idempotencyKey: string;
  enqueuedAt: string;
  retryCount: number;
  lastError?: string;
}

export interface ProcessQueueResult {
  succeeded: number;
  failed: number;
  remaining: number;
}

/**
 * Loads pending mutations from local storage.
 */
export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await SecureStore.getItemAsync(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

/**
 * Persists the entire queue to local storage.
 */
export async function saveOfflineQueue(queue: QueuedMutation[]): Promise<void> {
  try {
    if (queue.length === 0) {
      await SecureStore.deleteItemAsync(OFFLINE_QUEUE_STORAGE_KEY);
    } else {
      await SecureStore.setItemAsync(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (err) {
    console.error("Failed to save offline mutation queue:", err);
  }
}

/**
 * Enqueues a new mutation with a stable idempotency key for eventual replay.
 */
export async function enqueueMutation<T = unknown>(
  type: MutationType,
  payload: T,
  idempotencyKey?: string
): Promise<QueuedMutation<T>> {
  const item: QueuedMutation<T> = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    idempotencyKey: idempotencyKey ?? `offline_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    enqueuedAt: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = await getOfflineQueue();
  queue.push(item as QueuedMutation);
  await saveOfflineQueue(queue);

  return item;
}

/**
 * Dispatches a single queued mutation to the backend using its stored idempotency key.
 */
async function dispatchMutation(mutation: QueuedMutation): Promise<unknown> {
  const { type, payload, idempotencyKey } = mutation;
  const p = payload as any;

  switch (type) {
    case "SUBMIT_WASTE":
      return mobileApiClient.household.submitWaste(p, { idempotencyKey });

    case "CANCEL_PICKUP":
      return mobileApiClient.pickups.cancelPickup(
        p.pickupId,
        { reason: p.reason },
        { idempotencyKey }
      );

    case "CLAIM_PICKUP":
      return mobileApiClient.farmer.claimPickup(p.pickupId, { idempotencyKey });

    case "SCHEDULE_PICKUP":
      return mobileApiClient.farmer.schedulePickup(
        p.pickupId,
        {
          scheduledTime: p.scheduledTime,
          farmerNotes: p.farmerNotes,
        },
        { idempotencyKey }
      );

    case "COLLECT_PICKUP":
      return mobileApiClient.farmer.collectPickup(p.pickupId, { idempotencyKey });

    case "VERIFY_PICKUP":
      return mobileApiClient.farmer.verifyPickup(
        p.pickupId,
        {
          verifiedWeight: p.verifiedWeight,
          qualityGrade: p.qualityGrade,
          mediaId: p.mediaId,
          notes: p.notes,
        },
        { idempotencyKey }
      );

    default:
      throw new Error(`Unsupported offline mutation type: ${type}`);
  }
}

/**
 * Replays all queued mutations sequentially (FIFO).
 * Preserves the exact same idempotencyKey so deduplication is guaranteed.
 */
export async function processOfflineQueue(maxRetries = 5): Promise<ProcessQueueResult> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { succeeded: 0, failed: 0, remaining: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  const remainingQueue: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await dispatchMutation(mutation);
      succeeded++;
      // Do not add to remainingQueue (item successfully flushed)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown sync error";
      mutation.retryCount += 1;
      mutation.lastError = errMsg;

      if (mutation.retryCount >= maxRetries) {
        // Exceeded maximum retry threshold, drop from active queue
        failed++;
        console.warn(`Mutation ${mutation.id} dropped after ${maxRetries} failed retries:`, errMsg);
      } else {
        remainingQueue.push(mutation);
        failed++;
      }
    }
  }

  await saveOfflineQueue(remainingQueue);

  return {
    succeeded,
    failed,
    remaining: remainingQueue.length,
  };
}

/**
 * Clears all pending mutations from storage.
 */
export async function clearOfflineQueue(): Promise<void> {
  await SecureStore.deleteItemAsync(OFFLINE_QUEUE_STORAGE_KEY).catch(() => {});
}
