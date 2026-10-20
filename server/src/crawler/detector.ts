import type { Request, Response } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import type { AuthClassification, CapturedEndpoint } from '../types/index.js';
import { isBlacklistedOrStatic } from './filter.js';

export function isApiCandidate(request: Request, response: Response | null): boolean {
  const resourceType = request.resourceType();
  const url = request.url();

  let contentType = '';
  if (response) {
    contentType = (response.headers()['content-type'] || '').toLowerCase();
  }

  // Filter out static assets, telemetry, and framework hydration/routing files
  if (isBlacklistedOrStatic(url, resourceType, contentType)) {
    return false;
  }

  // Explicit JSON, XML, or GraphQL content types
  const isStructuredData =
    contentType.includes('application/json') ||
    contentType.includes('application/ld+json') ||
    contentType.includes('application/hal+json') ||
    contentType.includes('application/graphql+json') ||
    contentType.includes('application/xml') ||
    contentType.includes('text/xml');

  if (isStructuredData) {
    return true;
  }

  // Standard API URL paths (e.g. /api/, /graphql, /v1/)
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (
      pathname.startsWith('/api') ||
      pathname.includes('/api/') ||
      pathname.includes('/v1/') ||
      pathname.includes('/v2/') ||
      pathname.includes('/v3/') ||
      pathname.includes('/graphql') ||
      pathname.endsWith('/graphql')
    ) {
      // Reject if it returned HTML document
      if (contentType.includes('text/html')) {
        return false;
      }
      return true;
    }
  } catch {
    // ignore URL parsing errors
  }

  // Fetch or XHR requests that are not returning HTML
  if (resourceType === 'fetch' || resourceType === 'xhr') {
    if (contentType.includes('text/html')) {
      return false;
    }
    return true;
  }

  return false;
}

export function classifyAuthentication(
  requestHeaders: Record<string, string>,
  responseStatus: number
): AuthClassification {
  const details: string[] = [];
  const lowerHeaders: Record<string, string> = {};

  for (const [key, val] of Object.entries(requestHeaders)) {
    lowerHeaders[key.toLowerCase()] = val;
  }

  let authType: AuthClassification['authType'] = 'NONE';
  let isPublic = true;

  // 1. Check Authorization header
  if (lowerHeaders['authorization']) {
    const authHeader = lowerHeaders['authorization'];
    if (/^bearer\s+/i.test(authHeader)) {
      authType = 'BEARER_TOKEN';
      details.push('Authorization: Bearer token present in request header');
      isPublic = false;
    } else if (/^basic\s+/i.test(authHeader)) {
      authType = 'BASIC_AUTH';
      details.push('Authorization: Basic credentials present in request header');
      isPublic = false;
    } else {
      authType = 'CUSTOM_HEADER';
      details.push(`Authorization header present: ${authHeader.slice(0, 15)}...`);
      isPublic = false;
    }
  }

  // 2. Check API Key headers
  const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey', 'x-auth-token', 'x-access-token', 'token', 'access-token'];
  for (const header of apiKeyHeaders) {
    if (lowerHeaders[header]) {
      authType = 'API_KEY';
      details.push(`API Key header '${header}' present`);
      isPublic = false;
      break;
    }
  }

  // 3. Check Cookie headers with session/auth tokens
  if (lowerHeaders['cookie']) {
    const cookie = lowerHeaders['cookie'].toLowerCase();
    if (
      cookie.includes('session') ||
      cookie.includes('token') ||
      cookie.includes('jwt') ||
      cookie.includes('auth') ||
      cookie.includes('sid')
    ) {
      if (authType === 'NONE') {
        authType = 'COOKIE_AUTH';
      }
      details.push('Authentication/Session cookie transmitted');
      isPublic = false;
    }
  }

  // 4. Response status checks (401 Unauthorized or 403 Forbidden indicates protected endpoint)
  if (responseStatus === 401 || responseStatus === 403) {
    isPublic = false;
    details.push(`Response status ${responseStatus} indicates protected resource`);
  }

  if (isPublic && details.length === 0) {
    details.push('No credentials or authentication headers required (Open Public API)');
  }

  return {
    isPublic,
    authType,
    details
  };
}

export async function extractCapturedEndpoint(
  pageUrl: string,
  request: Request,
  response: Response,
  startTime: number
): Promise<CapturedEndpoint | null> {
  try {
    const url = request.url();
    const parsed = new URL(url);
    const method = request.method().toUpperCase();
    const status = response.status();
    const statusText = response.statusText();
    const requestHeaders = request.headers();
    const responseHeaders = response.headers();
    const contentType = responseHeaders['content-type'] || '';
    const responseTimeMs = Math.max(1, Date.now() - startTime);

    // Request body
    let requestBody: any = null;
    try {
      const postData = request.postData();
      if (postData) {
        try {
          requestBody = JSON.parse(postData);
        } catch {
          requestBody = postData;
        }
      }
    } catch {
      // Ignore body read errors
    }

    // Response body
    let responseBody: any = null;
    let responseSize = 0;
    try {
      // Limit to 1MB body extraction
      const bodyBuffer = await response.body();
      responseSize = bodyBuffer.length;

      if (responseSize <= 1024 * 1024) {
        const text = bodyBuffer.toString('utf-8');
        try {
          responseBody = JSON.parse(text);
        } catch {
          // If not valid JSON, check if it's text or XML
          if (contentType.includes('xml') || text.trim().startsWith('<')) {
            responseBody = text.slice(0, 5000);
          } else if (text.length < 2000) {
            responseBody = text;
          } else {
            responseBody = text.slice(0, 1000) + '... [truncated]';
          }
        }
      } else {
        responseBody = {
          _info: `Response body too large for inline preview (${(responseSize / 1024).toFixed(1)} KB)`
        };
      }
    } catch {
      responseBody = { _info: 'Response body could not be captured or was streamed' };
    }

    const authClassification = classifyAuthentication(requestHeaders, status);

    return {
      id: uuidv4(),
      pageUrl,
      method,
      url,
      pathname: parsed.pathname + parsed.search,
      origin: parsed.origin,
      status,
      statusText,
      contentType,
      responseTimeMs,
      resourceType: request.resourceType(),
      authClassification,
      requestHeaders,
      responseHeaders,
      requestBody,
      responseBody,
      responseSize,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return null;
  }
}
