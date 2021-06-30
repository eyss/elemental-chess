export const CHESS_SERVICE_CONTEXT = 'chess/service';
export const ENV: 'hcdev' | 'holodev' | 'hc' | 'holo' = process.env.ENV as any;

export function appId(): string | undefined {
  if (ENV === 'hc' || ENV === 'hcdev') return 'elemental-chess';
  else if (ENV === 'holodev')
    return 'uhCkkHSLbocQFSn5hKAVFc_L34ssLD52E37kq6Gw9O3vklQ3Jv7eL';
  else if (ENV === 'holo') return undefined;
}

export function appUrl(): string | null {
  // Hardcoded URL for the launcher
  if (ENV === 'hc') return `ws://localhost:8888`;
  else if (ENV === 'hcdev') return `ws://localhost:${process.env.HC_PORT}`;
  else if (ENV === 'holodev') return `http://localhost:${process.env.HC_PORT}`;
  else return null;
}

export function isHoloEnv() {
  return ENV === 'holodev' || ENV === 'holo';
}
