export interface ExecutableSelectData {
  shop: string;
  objectId: string;
  candidates: { path: string; name: string; size: number }[];
  suggestedDir: string | null;
  prefixDriveCPath: string;
  gameTitle: string;
  gameKey: string;
}
