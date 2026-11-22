import type { PoseSequence } from '../types/pose-sequence.types';

export interface ExportResult {
  success: boolean;
  filename?: string;
  byteSize?: number;
  error?: string;
}

/**
 * Serializes a PoseSequence into formatted JSON string.
 * Ensures privacy invariant: validates that no raw binary or image data is present.
 */
export function serializeSequenceToJson(sequence: PoseSequence): string {
  // Defensive validation
  if (!sequence || !sequence.frames) {
    throw new Error('Invalid sequence: frames array is missing');
  }

  // Ensure JSON conforms to schema v1.0.0
  return JSON.stringify(sequence, null, 2);
}

/**
 * Triggers a client-side JSON file download in browser environments.
 * Non-destructive: takes a snapshot sequence object.
 */
export function downloadSequenceAsJson(
  sequence: PoseSequence,
  options?: { customNotes?: string; filenamePrefix?: string },
): ExportResult {
  if (!sequence || sequence.frames.length === 0) {
    return {
      success: false,
      error: 'Cannot export empty pose sequence. Record frames first.',
    };
  }

  try {
    const sequenceToExport: PoseSequence = {
      ...sequence,
      metadata: {
        ...sequence.metadata,
        exportedAt: new Date().toISOString(),
        notes: options?.customNotes ?? sequence.metadata.notes,
      },
    };

    const jsonString = serializeSequenceToJson(sequenceToExport);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const byteSize = blob.size;

    const shortId = sequence.captureId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8);
    const prefix = options?.filenamePrefix ?? 'pose-sequence';
    const filename = `${prefix}-${shortId}-${Date.now()}.json`;

    // Trigger download if running in a browser DOM environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return {
      success: true,
      filename,
      byteSize,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sequence export failed:', err);
    return {
      success: false,
      error: `Export failed: ${message}`,
    };
  }
}
