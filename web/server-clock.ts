/** Authoritative epoch plus monotonic elapsed time, unaffected by device clock edits. */
export class ServerClock {
  private epoch: number | null = null;
  private observedAt = 0;
  constructor(private readonly monotonicNow: () => number = () => performance.now()) {}
  sync(serverTime: number): void {
    if (!Number.isFinite(serverTime) || serverTime < 946684800000) throw new Error('O servidor não informou uma hora válida.');
    this.epoch = serverTime;
    this.observedAt = this.monotonicNow();
  }
  now(): number {
    if (this.epoch === null) throw new Error('O relógio do servidor ainda não foi sincronizado.');
    return this.epoch + this.monotonicNow() - this.observedAt;
  }
}
