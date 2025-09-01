// Runtime configuration that can be updated without rebuilding
declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_API_URL?: string;
    };
  }
}

export const getApiUrl = (): string => {
  // Always use environment variable first
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // Check if we're in the browser and window.__ENV__ is available (production)
  if (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_API_URL) {
    return window.__ENV__.NEXT_PUBLIC_API_URL;
  }
  
  // Default fallback
  return 'http://localhost:8787';
};