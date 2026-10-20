export interface CrawlConfig {
  startUrl: string;
  maxDepth?: number;
  maxPages?: number;
  pageTimeoutMs?: number;
  waitAfterLoadMs?: number;
  includeThirdPartyApis?: boolean;
  customIgnorePatterns?: string[];
}

export type AuthType = 'NONE' | 'BEARER_TOKEN' | 'API_KEY' | 'BASIC_AUTH' | 'COOKIE_AUTH' | 'CUSTOM_HEADER';

export interface AuthClassification {
  isPublic: boolean;
  authType: AuthType;
  details: string[];
}

export interface CapturedEndpoint {
  id: string;
  pageUrl: string;
  method: string;
  url: string;
  pathname: string;
  origin: string;
  status: number;
  statusText: string;
  contentType: string;
  responseTimeMs: number;
  resourceType: string;
  authClassification: AuthClassification;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: any | null;
  responseBody: any | null;
  responseSize: number;
  timestamp: string;
}

export interface PageCrawlResult {
  url: string;
  depth: number;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  statusCode?: number;
  title?: string;
  discoveredInternalLinks: string[];
  endpointsCount: number;
  error?: string;
}

export interface CrawlStats {
  pagesScanned: number;
  pagesQueued: number;
  pagesFailed: number;
  totalApisFound: number;
  publicApisFound: number;
  protectedApisFound: number;
  durationMs: number;
  startTime: string;
  endTime?: string;
}

export interface CrawlSession {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'stopped' | 'failed';
  config: CrawlConfig;
  stats: CrawlStats;
  pages: Record<string, PageCrawlResult>;
  endpoints: CapturedEndpoint[];
  currentUrl: string | null;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'api';

export interface LogMessage {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

export type SseEvent =
  | { type: 'INIT'; session: CrawlSession }
  | { type: 'LOG'; log: LogMessage }
  | { type: 'PAGE_START'; url: string; depth: number }
  | { type: 'PAGE_COMPLETE'; page: PageCrawlResult; stats: CrawlStats }
  | { type: 'ENDPOINT_FOUND'; endpoint: CapturedEndpoint; stats: CrawlStats }
  | { type: 'SESSION_COMPLETE'; session: CrawlSession }
  | { type: 'SESSION_STOPPED'; session: CrawlSession }
  | { type: 'SESSION_ERROR'; error: string; session: CrawlSession };
