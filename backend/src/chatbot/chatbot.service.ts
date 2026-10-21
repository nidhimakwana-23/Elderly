/**
 * chatbot.service.ts
 *
 * Responsible for:
 *  1. Calling the Python ML classifier (predict.py) via child_process.spawn.
 *  2. Parsing and validating the JSON result.
 *  3. Dispatching to the correct DB-backed analytics service based on intent.
 *  4. Returning a deterministic, factual answer.
 *
 * Privacy invariant: only the raw question string is sent to Python.
 * Patient medical data never leaves the Node process.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';
import {
  isChatbotIntent,
  type ChatbotIntent,
  type IntentPrediction,
  type ChatbotResponse,
} from './chatbot.types';
import type { MedicineLogsService } from '../medicine-logs/medicine-logs.service';
import type { HealthCheckService } from '../health-check/health-check.service';
import type { HealthTrendService } from '../health-trend/health-trend.service';
import type { MedicineService } from '../medicine/medicine.service';

// ── Environment-configurable paths ────────────────────────────────────────────
// ESM-compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the Python executable to use:
 * 1. CHATBOT_PYTHON_EXECUTABLE environment variable if set
 * 2. Virtual environment python in ml/intent-classifier/.venv if it exists
 * 3. Default 'python' from system PATH
 */
function getPythonExecutable(): string {
  if (process.env['CHATBOT_PYTHON_EXECUTABLE']) {
    return process.env['CHATBOT_PYTHON_EXECUTABLE'];
  }
  const isWin = process.platform === 'win32';
  const venvPython = path.resolve(
    __dirname,
    isWin
      ? '../../../ml/intent-classifier/.venv/Scripts/python.exe'
      : '../../../ml/intent-classifier/.venv/bin/python',
  );
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python';
}

/**
 * Resolves the predict.py script path:
 * 1. CHATBOT_PREDICT_SCRIPT environment variable if set (absolute or cwd-relative)
 * 2. Default: relative to this file -> ../../../ml/intent-classifier/predict.py
 */
function getPredictScript(): string {
  if (process.env['CHATBOT_PREDICT_SCRIPT']) {
    const envPath = process.env['CHATBOT_PREDICT_SCRIPT'];
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '../../../ml/intent-classifier/predict.py');
}

// Spawn timeout in milliseconds (default: 20 s to accommodate cold starts on Windows)
const PROCESS_TIMEOUT_MS = Number(process.env['CHATBOT_PROCESS_TIMEOUT_MS']) || 20_000;

// Maximum allowed stdout buffer from the Python process (64 KB)
const MAX_OUTPUT_BYTES = 64 * 1024;

// ─── On-time tolerance ───────────────────────────────────────────────────────
// A medicine is considered "on time" if the delay is within this window.
// This is a software analytics rule, not a medical recommendation.
const ON_TIME_TOLERANCE_MINUTES = 30;

// ─── Health-trend window ─────────────────────────────────────────────────────
// Number of days to look back when analysing health trends.
const TREND_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────

/** Returns a 'YYYY-MM-DD' string from a Date object (safe under noUncheckedIndexedAccess). */
function toDateString(d: Date): string {
  return d.toISOString().substring(0, 10);
}

export class ChatbotService {
  constructor(
    private readonly medicineLogsService: MedicineLogsService,
    private readonly healthCheckService: HealthCheckService,
    private readonly healthTrendService: HealthTrendService,
    private readonly medicineService: MedicineService,
  ) {}

  // ── Step 1: Intent classification ──────────────────────────────────────────

  /**
   * Call the Python ML classifier.
   * Only the raw question string is passed; no patient data is included.
   */
  async classifyIntent(question: string): Promise<IntentPrediction> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new Error('Question must not be empty.');
    }

    const scriptPath = getPredictScript();
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Intent classifier script not found at: ${scriptPath}`);
    }

    const pythonExecutable = getPythonExecutable();

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputLimitExceeded = false;

      // Use spawn (not exec) so the question is passed as a process argument,
      // not interpolated into a shell command string.
      const child = spawn(pythonExecutable, [scriptPath, trimmed], {
        shell: false, // explicit: no shell injection possible
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
        reject(new Error(`Python classifier timed out after ${PROCESS_TIMEOUT_MS} ms`));
      }, PROCESS_TIMEOUT_MS);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        if (stdout.length > MAX_OUTPUT_BYTES && !outputLimitExceeded) {
          outputLimitExceeded = true;
          child.kill();
          clearTimeout(timer);
          reject(new Error(`Python classifier output exceeded maximum allowed limit of ${MAX_OUTPUT_BYTES} bytes`));
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (timedOut || outputLimitExceeded) return;

        if (stderr.trim()) {
          logger.warn('[ChatbotService] Python stderr:', stderr.trim());
        }

        if (code !== 0) {
          reject(new Error(`predict.py exited with code ${code ?? 'null'}. Stderr: ${stderr.trim()}`));
          return;
        }

        // Parse and validate the JSON output
        let parsed: unknown;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch {
          reject(new Error(`predict.py returned non-JSON output: ${stdout.trim()}`));
          return;
        }

        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('intent' in parsed) ||
          !('confidence' in parsed)
        ) {
          reject(new Error(`predict.py returned unexpected structure: ${JSON.stringify(parsed)}`));
          return;
        }

        const raw = parsed as Record<string, unknown>;

        if (
          typeof raw['confidence'] !== 'number' ||
          !Number.isFinite(raw['confidence']) ||
          raw['confidence'] < 0 ||
          raw['confidence'] > 1
        ) {
          reject(new Error(`predict.py returned invalid confidence: ${raw['confidence']}`));
          return;
        }

        let intent: ChatbotIntent;
        if (isChatbotIntent(raw['intent'])) {
          intent = raw['intent'];
        } else {
          logger.warn(`[ChatbotService] Unrecognised intent from model: "${raw['intent']}". Treating as unknown.`);
          intent = 'unknown';
        }

        resolve({
          intent,
          confidence: Number(raw['confidence'].toFixed(4)),
        });
      });

      child.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start Python process (${pythonExecutable}): ${err.message}`));
      });
    });
  }

  // ── Step 2: Intent dispatcher ───────────────────────────────────────────────

  /**
   * Given an intent prediction and a verified patient ID, run the appropriate
   * DB analytics and build a factual, deterministic answer.
   */
  async buildAnswer(prediction: IntentPrediction, patientId: string): Promise<ChatbotResponse> {
    const { intent, confidence } = prediction;

    let answer: string;

    switch (intent) {
      case 'medicine_today':
        answer = await this.getMedicineTodayAnswer(patientId);
        break;
      case 'medicine_missed':
        answer = await this.getMedicineMissedAnswer(patientId);
        break;
      case 'medicine_timing':
        answer = await this.getMedicineTimingAnswer(patientId);
        break;
      case 'medicine_pattern':
        answer = await this.getMedicinePatternAnswer(patientId);
        break;
      case 'sugar_trend':
        answer = await this.getSugarTrendAnswer(patientId);
        break;
      case 'bp_trend':
        answer = await this.getBpTrendAnswer(patientId);
        break;
      case 'weight_trend':
        answer = await this.getWeightTrendAnswer(patientId);
        break;
      case 'health_summary':
        answer = await this.getHealthSummaryAnswer(patientId);
        break;
      case 'unknown':
      default:
        answer =
          "I couldn't identify what health information you are asking about. " +
          'Please try asking about medicines, blood pressure, blood sugar, weight, or a recent health summary.';
    }

    return { intent, confidence, answer };
  }

  // ── Intent handlers ─────────────────────────────────────────────────────────

  private async getMedicineTodayAnswer(patientId: string): Promise<string> {
    const todayString = new Date().toISOString().split('T')[0]!;
    const logs = await this.medicineLogsService.getMedicineHistory(patientId, todayString);

    if (logs.length === 0) {
      return 'No medicine logs were found for today.';
    }

    const taken  = logs.filter((l) => l.status === 'Taken');
    const missed = logs.filter((l) => l.status === 'Missed');
    const skipped = logs.filter((l) => l.status === 'Skipped');
    const pending = logs.filter((l) => l.status === 'Pending');

    const lines: string[] = [`Medicine status for today (${todayString}):`];

    if (taken.length > 0) {
      lines.push(
        `  ✓ Taken (${taken.length}): ` +
          taken.map((l) => `${l.medicineName}${l.takenTime ? ` at ${l.takenTime}` : ''}`).join(', ')
      );
    }
    if (missed.length > 0) {
      lines.push(`  ✗ Missed (${missed.length}): ` + missed.map((l) => l.medicineName).join(', '));
    }
    if (skipped.length > 0) {
      lines.push(`  — Skipped (${skipped.length}): ` + skipped.map((l) => l.medicineName).join(', '));
    }
    if (pending.length > 0) {
      lines.push(`  ⏳ Pending (${pending.length}): ` + pending.map((l) => `${l.medicineName} (scheduled ${l.scheduledTime})`).join(', '));
    }

    return lines.join('\n');
  }

  private async getMedicineMissedAnswer(patientId: string): Promise<string> {
    const logs = await this.medicineLogsService.getMedicineHistory(patientId);
    const missedOrSkipped = logs.filter((l) => l.status === 'Missed' || l.status === 'Skipped');

    if (missedOrSkipped.length === 0) {
      return 'No missed or skipped medicines were found in the records.';
    }

    // Group by date for readability
    const byDate: Record<string, typeof missedOrSkipped> = {};
    for (const log of missedOrSkipped) {
      const d = log.scheduledDate ?? 'Unknown date';
      (byDate[d] ??= []).push(log);
    }

    const lines: string[] = [`Missed / skipped medicines (${missedOrSkipped.length} total):`];
    const sortedDates = Object.keys(byDate).sort().reverse().slice(0, 7); // Show last 7 days

    for (const date of sortedDates) {
      const entries = byDate[date]!;
      lines.push(`  ${date}:`);
      for (const e of entries) {
        const reason = e.status === 'Skipped' && e.skippedReason ? ` (reason: ${e.skippedReason})` : '';
        lines.push(`    • ${e.medicineName} — ${e.status}${reason}`);
      }
    }

    return lines.join('\n');
  }

  private async getMedicineTimingAnswer(patientId: string): Promise<string> {
    const logs = await this.medicineLogsService.getMedicineHistory(patientId);
    const takenLogs = logs.filter((l) => l.status === 'Taken' && l.scheduledTime && l.takenTime);

    if (takenLogs.length === 0) {
      return 'No "Taken" medicine logs with both scheduled time and taken time were found to assess timing.';
    }

    let onTime = 0;
    let late = 0;

    const parseTime = (timeStr: string): Date | null => {
      // Handles "09:05 AM", "HH:MM", etc.
      const d = new Date(`1970-01-01 ${timeStr}`);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const log of takenLogs) {
      const scheduled = parseTime(log.scheduledTime!);
      const taken     = parseTime(log.takenTime!);
      if (!scheduled || !taken) continue;

      const delayMinutes = (taken.getTime() - scheduled.getTime()) / 60_000;
      if (Math.abs(delayMinutes) <= ON_TIME_TOLERANCE_MINUTES) {
        onTime++;
      } else {
        late++;
      }
    }

    const total = onTime + late;
    const pct   = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return (
      `Medicine timing analysis (tolerance: ±${ON_TIME_TOLERANCE_MINUTES} minutes):\n` +
      `  Taken on time : ${onTime} / ${total} doses (${pct}%)\n` +
      `  Taken late    : ${late} / ${total} doses\n` +
      (pct >= 80
        ? '  Overall: She is generally taking her medicines on time.'
        : pct >= 50
          ? '  Overall: She is sometimes late in taking her medicines.'
          : '  Overall: She is frequently taking her medicines outside the scheduled time.')
    );
  }

  private async getMedicinePatternAnswer(patientId: string): Promise<string> {
    const report = await this.medicineLogsService.generateReport(patientId, 'weekly');

    return (
      `Medicine adherence — last 7 days:\n` +
      `  Total unique medicines : ${report.totalMedicines}\n` +
      `  Taken                  : ${report.taken}\n` +
      `  Missed                 : ${report.missed}\n` +
      `  Pending                : ${report.pending}\n` +
      `  Adherence rate         : ${report.adherence}\n` +
      (report.today.length > 0
        ? `\n  Today's medicines:\n` +
            report.today.map((t) => `    • ${t.medicineName} — ${t.status}${t.takenTime ? ` (taken at ${t.takenTime})` : ''}`).join('\n')
        : '')
    );
  }

  private async getSugarTrendAnswer(patientId: string): Promise<string> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - TREND_DAYS);
    const summary = await this.healthTrendService.getPatientSummary(patientId, {
      from: toDateString(fromDate),
    });

    const checks = summary.healthChecks.filter((c) => c.sugar_level != null);
    if (checks.length === 0) {
      return `No blood sugar records were found in the last ${TREND_DAYS} days.`;
    }

    const values = checks.map((c) => c.sugar_level!);
    const latest = values[0]!;
    const oldest = values[values.length - 1]!;
    const avg    = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100;
    const trend  = latest > oldest ? 'increased' : latest < oldest ? 'decreased' : 'remained stable';

    return (
      `Blood sugar trend — last ${TREND_DAYS} days (${checks.length} readings):\n` +
      `  Latest  : ${latest}\n` +
      `  Average : ${avg}\n` +
      `  Oldest  : ${oldest}\n` +
      `  Trend   : Her recorded blood sugar values have ${trend} over the selected period.`
    );
  }

  private async getBpTrendAnswer(patientId: string): Promise<string> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - TREND_DAYS);
    const summary = await this.healthTrendService.getPatientSummary(patientId, {
      from: toDateString(fromDate),
    });

    const checks = summary.healthChecks.filter((c) => c.blood_pressure != null);
    if (checks.length === 0) {
      return `No blood pressure records were found in the last ${TREND_DAYS} days.`;
    }

    const readings = checks.map((c) => `${c.date}: ${c.blood_pressure}`);
    const latest   = checks[0]!;

    return (
      `Blood pressure trend — last ${TREND_DAYS} days (${checks.length} readings):\n` +
      `  Latest reading : ${latest.blood_pressure} (${latest.date})\n` +
      `  All readings (newest first):\n` +
      readings.slice(0, 10).map((r) => `    • ${r}`).join('\n') +
      (checks.length > 10 ? `\n    … and ${checks.length - 10} more records.` : '')
    );
  }

  private async getWeightTrendAnswer(patientId: string): Promise<string> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - TREND_DAYS);
    const summary = await this.healthTrendService.getPatientSummary(patientId, {
      from: toDateString(fromDate),
    });

    const checks = summary.healthChecks.filter((c) => c.weight != null);
    if (checks.length === 0) {
      return `No weight records were found in the last ${TREND_DAYS} days.`;
    }

    const values = checks.map((c) => c.weight!);
    const latest = values[0]!;
    const oldest = values[values.length - 1]!;
    const change = Math.round((latest - oldest) * 100) / 100;
    const direction = change > 0 ? 'gained' : change < 0 ? 'lost' : 'maintained the same';

    return (
      `Weight trend — last ${TREND_DAYS} days (${checks.length} readings):\n` +
      `  Latest : ${latest} kg\n` +
      `  Oldest : ${oldest} kg\n` +
      `  Change : ${Math.abs(change)} kg — She has ${direction} weight over the selected period.`
    );
  }

  private async getHealthSummaryAnswer(patientId: string): Promise<string> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - TREND_DAYS);
    const summary  = await this.healthTrendService.getPatientSummary(patientId, {
      from: toDateString(fromDate),
    });
    const report   = await this.medicineLogsService.generateReport(patientId, 'weekly');

    const { vitalTrends } = summary;
    const lines: string[] = [`Recent health summary — last ${TREND_DAYS} days:`];

    lines.push('\nMedicines (last 7 days):');
    lines.push(`  Adherence : ${report.adherence}`);
    lines.push(`  Taken     : ${report.taken}  |  Missed: ${report.missed}  |  Pending: ${report.pending}`);

    lines.push('\nVitals:');
    if (vitalTrends.latestBP)    lines.push(`  Blood pressure (latest) : ${vitalTrends.latestBP}`);
    if (vitalTrends.avgSugarLevel != null) lines.push(`  Avg blood sugar         : ${vitalTrends.avgSugarLevel}`);
    if (vitalTrends.avgWeight != null)     lines.push(`  Avg weight              : ${vitalTrends.avgWeight} kg`);
    if (vitalTrends.avgBmi != null)        lines.push(`  Avg BMI                 : ${vitalTrends.avgBmi}`);
    if (vitalTrends.latestBloodLevel)      lines.push(`  Blood level (latest)    : ${vitalTrends.latestBloodLevel}`);

    if (
      !vitalTrends.latestBP &&
      vitalTrends.avgSugarLevel == null &&
      vitalTrends.avgWeight == null
    ) {
      lines.push('  No vital records found in the selected period.');
    }

    return lines.join('\n');
  }
}
