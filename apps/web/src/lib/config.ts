// Runtime configuration that can be updated without rebuilding
declare global {
  interface Window {
    __ENV__?: {
      NEXT_PUBLIC_API_URL?: string;
    };
  }
}

export const getApiUrl = (): string => {
  // Check if we're in the browser and window.__ENV__ is available
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  }
  
  // Fallback to process.env
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
};