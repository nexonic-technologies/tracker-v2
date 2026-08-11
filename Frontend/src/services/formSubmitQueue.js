import toast from "react-hot-toast";
import { saveFormDraft, clearFormDraft } from "../utils/formDrafts";

const queue = [];
let processing = false;

/** Minimum gap between API calls from the queue (ms). */
const QUEUE_GAP_MS = 450;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    try {
      await job.execute();
      if (job.draftKey) clearFormDraft(job.draftKey);
      job.onSuccess?.();
    } catch (err) {
      if (job.draftKey && job.draft) {
        saveFormDraft(job.draftKey, job.draft);
      }
      const message =
        err?.response?.data?.message || err?.message || "Save failed";
      toast.error(`${message} — draft saved locally`, { duration: 5000 });
      job.onError?.(err);
    }
    if (queue.length > 0) await wait(QUEUE_GAP_MS);
  }

  processing = false;
}

/**
 * Enqueue a form POST/PATCH. Caller should navigate away immediately.
 * @param {{ draftKey?: string, draft?: object, execute: () => Promise<any>, onSuccess?: () => void, onError?: (err: any) => void }} job
 */
export function enqueueFormSubmit(job) {
  queue.push(job);
  drainQueue();
}

export function getQueueLength() {
  return queue.length;
}

export default {
  enqueueFormSubmit,
  getQueueLength,
};
