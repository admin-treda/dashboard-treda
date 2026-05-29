let lastCollectTime: Date | null = null;
let lastCollectResult: any = null;

export function getCollectTime(): Date | null {
  return lastCollectTime;
}

export function getCollectResult(): any {
  return lastCollectResult;
}

export function setCollectResult(result: any): void {
  lastCollectTime = new Date();
  lastCollectResult = result;
}
