export interface FetchReadmeParams {
  repoUrl: string;
}

export interface FetchReadmeResult {
  success: boolean;
  content?: string;
  error?: string;
}
