/**
 * Zero-Cost Google Drive API Quota Management Queue
 * 
 * Enforces steady 15 requests/second throttling (900 req/min) to stay safely below
 * the 1,200 req/minute project limit without requiring paid Redis, BullMQ, or Cloud Tasks.
 * 
 * Implements:
 * - Token Bucket Rate Limiting (capacity: 100, refill rate: 15 tokens/sec)
 * - Exponential backoff with randomized jitter on network friction
 * - Real-time quota metrics for campus administration
 * - Zero-server client-side execution (Web Worker / Async Queue)
 */

import { QuotaQueueTask, QuotaHealthSnapshot } from '../types';

type Listener = (snapshot: QuotaHealthSnapshot) => void;

class QuotaQueueService {
  private queue: QuotaQueueTask[] = [];
  private isProcessing = false;
  private tokenBucket = 100;
  private readonly maxBucketCapacity = 100;
  private readonly refillRatePerSecond = 15; // 15 tokens per second (safe margin below 20/s and 1,200/min)
  private lastRefillTimestamp = Date.now();
  
  // Metrics
  private processedCount = 0;
  private throttledCount = 0;
  private http429Count = 0;
  private listeners: Set<Listener> = new Set();
  private burstInterval: any = null;
  private isBurstActive = false;

  constructor() {
    // Start continuous token refill loop
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.refillTokens();
        this.processNextBatch();
        this.notifyListeners();
      }, 200); // 5 ticks per second
    }
  }

  private refillTokens() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
    this.tokenBucket = Math.min(this.maxBucketCapacity, this.tokenBucket + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public enqueueTask(
    type: QuotaQueueTask['type'],
    targetRollNo?: string,
    fileName?: string,
    priority: QuotaQueueTask['priority'] = 'NORMAL'
  ): QuotaQueueTask {
    const task: QuotaQueueTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      targetRollNo,
      fileName,
      priority,
      createdAt: Date.now(),
      status: 'QUEUED',
      retryCount: 0,
    };

    if (priority === 'HIGH') {
      this.queue.unshift(task);
    } else {
      this.queue.push(task);
    }

    this.notifyListeners();
    this.processNextBatch();
    return task;
  }

  private async processNextBatch() {
    if (this.isProcessing || this.queue.length === 0) return;

    // Check if tokens are available
    if (this.tokenBucket < 1) {
      this.throttledCount++;
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift();
    if (!task) {
      this.isProcessing = false;
      return;
    }

    this.tokenBucket -= 1;
    task.status = 'PROCESSING';
    const startTime = performance.now();

    try {
      // Simulate real asynchronous Drive API roundtrip (40-90ms)
      const simulatedLatency = Math.floor(Math.random() * 50) + 40;
      await new Promise((resolve) => setTimeout(resolve, simulatedLatency));

      task.latencyMs = Math.round(performance.now() - startTime);
      task.status = 'COMPLETED';
      this.processedCount++;
    } catch {
      // Exponential backoff retry logic
      if (task.retryCount < 3) {
        task.retryCount++;
        task.status = 'RETRYING';
        const backoffDelay = Math.pow(2, task.retryCount) * 100 + Math.random() * 50;
        setTimeout(() => {
          this.queue.unshift(task);
        }, backoffDelay);
      } else {
        task.status = 'FAILED';
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processNextBatch();
      }
    }
  }

  public simulateBurst(studentCount = 200) {
    if (this.isBurstActive) return;
    this.isBurstActive = true;

    // Generate batch of metadata verification tasks
    const branches = ['CSE', 'ECE', 'MECH', 'IT', 'CIVIL'];
    for (let i = 0; i < studentCount; i++) {
      const branch = branches[i % branches.length];
      const roll = `21A91A${branch.slice(0, 2)}${(i % 60 + 1).toString().padStart(2, '0')}`;
      this.enqueueTask('METADATA_FETCH', roll, `cert_${roll}.pdf`, i < 10 ? 'HIGH' : 'NORMAL');
    }

    // Auto-disable burst flag once queue drains
    const checkDrain = setInterval(() => {
      if (this.queue.length === 0) {
        this.isBurstActive = false;
        clearInterval(checkDrain);
        this.notifyListeners();
      }
    }, 500);
  }

  public clearQueue() {
    this.queue = [];
    this.isBurstActive = false;
    this.notifyListeners();
  }

  public getSnapshot(): QuotaHealthSnapshot {
    const queueLen = this.queue.length;
    const estTimeDrain = queueLen > 0 ? Math.ceil(queueLen / this.refillRatePerSecond) : 0;

    return {
      requestsPerSecond: this.refillRatePerSecond,
      maxSafeLimitPerSec: 20, // Google limit is 20/s (1,200/min)
      tokenBucketBalance: Math.round(this.tokenBucket),
      tokenBucketCapacity: this.maxBucketCapacity,
      queuedTasksCount: queueLen,
      processedTasksCount: this.processedCount,
      throttledRequestsCount: this.throttledCount,
      http429Errors: this.http429Count,
      activeWorkers: this.isProcessing ? 1 : 0,
      estimatedTimeToDrainSec: estTimeDrain,
      isBurstSimulating: this.isBurstActive,
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export const quotaQueueService = new QuotaQueueService();
