/**
 * Dev-only test panel for injecting known shader code and testing auto-repair.
 * Only rendered when import.meta.env.DEV is true.
 */

import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { aiService, type DevTestRepairMode } from '../../ai/service';
import { TEST_SHADERS } from '../../ai/__tests__/dev-test-shaders';

const REPAIR_MODES: { value: DevTestRepairMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'repair-success', label: 'Success' },
  { value: 'repair-invalid', label: 'Invalid' },
  { value: 'repair-api-error', label: 'API Error' },
  { value: 'repair-delayed', label: 'Delayed (5s)' },
];

export function DevTestPanel() {
  const setCodeFromAI = useEditorStore((s) => s.setCodeFromAI);
  const codeSource = useEditorStore((s) => s.codeSource);
  const lastRequestId = useEditorStore((s) => s.lastRequestId);
  const [injectedId, setInjectedId] = useState<string | null>(null);
  const [repairMode, setRepairMode] = useState<DevTestRepairMode>('off');

  const handleInject = useCallback((presetId: string) => {
    const preset = TEST_SHADERS.find((s) => s.id === presetId);
    if (!preset) return;

    const requestId = `test-${presetId}-${Date.now()}`;
    aiService.setTestGenerationContext(requestId, preset.spec.scene.subject || presetId, preset.spec, preset.plan);
    setCodeFromAI(preset.code, requestId);
    setInjectedId(presetId);
  }, [setCodeFromAI]);

  const handleRepairModeChange = useCallback((mode: DevTestRepairMode) => {
    setRepairMode(mode);
    aiService.setDevTestRepairMode(mode);
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 8,
      right: 8,
      background: 'rgba(13,17,23,0.95)',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '8px 10px',
      zIndex: 9999,
      fontSize: 11,
      fontFamily: 'monospace',
      color: '#c9d1d9',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 220,
    }}>
      <div style={{ fontWeight: 600, color: '#f0883e', fontSize: 10 }}>
        🧪 DEV: Test Harness
      </div>

      {/* Shader injection */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {TEST_SHADERS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleInject(preset.id)}
            style={{
              background: injectedId === preset.id ? '#238636' : '#21262d',
              border: '1px solid #30363d',
              borderRadius: 4,
              color: '#c9d1d9',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Repair mode selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, color: '#8b949e' }}>Repair:</span>
        <select
          value={repairMode}
          onChange={(e) => handleRepairModeChange(e.target.value as DevTestRepairMode)}
          style={{
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: 4,
            color: '#c9d1d9',
            padding: '2px 6px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          {REPAIR_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div style={{ fontSize: 9, color: '#8b949e' }}>
        codeSource: {codeSource} | reqId: {lastRequestId ? lastRequestId.slice(0, 20) + '...' : 'null'}
      </div>
    </div>
  );
}
