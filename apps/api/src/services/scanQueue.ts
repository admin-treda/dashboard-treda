// ScanQueue — Limita scans concurrentes con cola FIFO
// Max 2 scans simultaneos, el resto espera en cola

const MAX_CONCURRENT = 2;

interface QueueItem {
  scanId: string;
  fn: () => Promise<void>;
}

let running = 0;
const queue: QueueItem[] = [];

function processNext() {
  if (running >= MAX_CONCURRENT || queue.length === 0) return;
  const item = queue.shift()!;
  running++;
  item.fn().finally(() => {
    running--;
    processNext();
  });
}

export function enqueueScan(scanId: string, fn: () => Promise<void>): { queued: boolean; position: number } {
  if (running < MAX_CONCURRENT) {
    running++;
    fn().finally(() => {
      running--;
      processNext();
    });
    return { queued: false, position: 0 };
  }
  queue.push({ scanId, fn });
  return { queued: true, position: queue.length };
}

export function getQueueStatus() {
  return {
    running,
    maxConcurrent: MAX_CONCURRENT,
    queued: queue.length,
    queue: queue.map((item, i) => ({ position: i + 1, scanId: item.scanId })),
  };
}

export function cancelScan(scanId: string): boolean {
  const idx = queue.findIndex(item => item.scanId === scanId);
  if (idx >= 0) {
    queue.splice(idx, 1);
    return true;
  }
  return false;
}
