const MAX_URL_LENGTH = 8000;

export function encodeShaderToUrl(code: string): string | null {
  try {
    // Compress using base64
    const encoded = btoa(unescape(encodeURIComponent(code)));

    // Check if URL would be too long
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}#code=${encoded}`;

    if (fullUrl.length > MAX_URL_LENGTH) {
      return null; // Too long for URL
    }

    return fullUrl;
  } catch {
    return null;
  }
}

export function decodeShaderFromUrl(): string | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#code=')) return null;

    const encoded = hash.slice(6); // Remove '#code='
    const decoded = decodeURIComponent(escape(atob(encoded)));

    // Validate it looks like GLSL
    if (!decoded.includes('void') || decoded.length < 10) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function clearShaderFromUrl(): void {
  window.location.hash = '';
}

export function copyShareUrl(code: string): boolean {
  const url = encodeShaderToUrl(code);
  if (!url) return false;

  try {
    navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function exportShaderAsJson(code: string, name: string): void {
  const project = {
    name,
    code,
    version: 1,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.shaderforge.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShaderAsGlsl(code: string, name: string): void {
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.glsl`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importShaderFromFile(): Promise<{ name: string; code: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.glsl,.frag,.txt';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const text = await file.text();

      // Try to parse as JSON
      if (file.name.endsWith('.json')) {
        try {
          const project = JSON.parse(text);
          if (project.code) {
            resolve({ name: project.name || file.name, code: project.code });
            return;
          }
        } catch {
          // Not valid JSON
        }
      }

      // Treat as raw GLSL
      resolve({ name: file.name.replace(/\.[^.]+$/, ''), code: text });
    };

    input.click();
  });
}
