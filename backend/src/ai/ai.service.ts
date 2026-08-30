import { GoogleGenerativeAI } from '@google/generative-ai';

import { logger } from '../utils/logger';
import { HealthCheckService } from '../health-check/health-check.service';
import { MedicineLogsService } from '../medicine-logs/medicine-logs.service';
import { MedicineService } from '../medicine/medicine.service';
import { ChatMessage } from './ai.types';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

export class AiService {
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly modelPath: string;

  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly medicineLogsService: MedicineLogsService,
    private readonly medicineService: MedicineService,
  ) {
    const modelPath = process.env['QWEN_MODEL_PATH'];
    if (!modelPath) {
      throw new Error('QWEN_MODEL_PATH environment variable is not set');
    }
    this.modelPath = modelPath;
    // No immediate model instantiation; session will be created on demand
  }

  /**
   * Fetches all patient data from the DB and builds a rich system prompt.
   */
  private async buildSystemPrompt(patientId: string): Promise<string> {
    // ── Fetch data in parallel ──────────────────────────────────────────────
    const [medicines, healthChecks, medicineLogs] = await Promise.all([
      this.medicineService.getMedicines(patientId),
      this.healthCheckService.getHealthChecks(patientId),
      this.medicineLogsService.getMedicineHistory(patientId),
    ]);

    // ── Format medicines ────────────────────────────────────────────────────
    let medicinesSection = '(No medicines found for this patient)';
    if (medicines.length > 0) {
      medicinesSection = medicines
        .map(
          (m, i) =>
            `${i + 1}. ${m.medicine_name} ${m.dosage}${m.strength ? ' / ' + m.strength : ''} | ${m.frequency} | Timing: ${m.timing.join(', ')} | Status: ${m.status}${m.notes ? ' | Notes: ' + m.notes : ''}`,
        )
        .join('\n');
    }

    // ── Format health checks (most recent 30) ───────────────────────────────
    const recentChecks = [...healthChecks]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    let healthSection = '(No health records found for this patient)';
    if (recentChecks.length > 0) {
      healthSection = recentChecks
        .map(
          (h) =>
            `Date: ${h.date} | Sugar: ${h.sugar_level ?? 'N/A'} mg/dL | BP: ${h.blood_pressure ?? 'N/A'} | Weight: ${h.weight ?? 'N/A'} kg | BMI: ${h.bmi ?? 'N/A'}${h.notes ? ' | Notes: ' + h.notes : ''}`,
        )
        .join('\n');
    }

    // ── Analyse medicine log adherence per medicine per period ──────────────
    // Filter to last 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    const recentLogs = medicineLogs.filter(
      (l) => new Date(l.scheduledDate) >= cutoff,
    );

    type PeriodKey = 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Other';
    type LogCounts = { taken: number; missed: number; skipped: number; total: number };

    // Group by medicineName → period → counts
    const adherenceMap = new Map<string, Map<PeriodKey, LogCounts>>();

    for (const log of recentLogs) {
      const medKey = log.medicineName;
      const period: PeriodKey = (log.period as PeriodKey) ?? 'Other';

      if (!adherenceMap.has(medKey)) {
        adherenceMap.set(medKey, new Map());
      }
      const periodMap = adherenceMap.get(medKey)!;

      if (!periodMap.has(period)) {
        periodMap.set(period, { taken: 0, missed: 0, skipped: 0, total: 0 });
      }
      const counts = periodMap.get(period)!;
      counts.total++;
      if (log.status === 'Taken') counts.taken++;
      else if (log.status === 'Missed') counts.missed++;
      else if (log.status === 'Skipped') counts.skipped++;
    }

    let adherenceSection = '(No medicine log data for the last 60 days)';
    if (adherenceMap.size > 0) {
      const lines: string[] = [];
      adherenceMap.forEach((periodMap, medName) => {
        lines.push(`\n${medName}:`);
        periodMap.forEach((counts, period) => {
          const skipNote =
            counts.skipped > counts.total * 0.3
              ? ' ← FREQUENTLY SKIPPED'
              : counts.missed > counts.total * 0.3
                ? ' ← FREQUENTLY MISSED'
                : '';
          lines.push(
            `  ${period}: Taken ${counts.taken}/${counts.total}, Skipped ${counts.skipped}/${counts.total}, Missed ${counts.missed}/${counts.total}${skipNote}`,
          );
        });
      });
      adherenceSection = lines.join('\n');
    }

    // ── Overall adherence rate ──────────────────────────────────────────────
    const totalLogs = recentLogs.length;
    const totalTaken = recentLogs.filter((l) => l.status === 'Taken').length;
    const adherenceRate =
      totalLogs > 0 ? Math.round((totalTaken / totalLogs) * 100) : null;

    return `You are a compassionate, knowledgeable elderly health assistant AI. You have been given the following real-time data retrieved from the patient's health records. Analyse this data carefully before responding.

=== CURRENT MEDICINES (as of today) ===
${medicinesSection}

=== RECENT HEALTH CHECK RECORDS (last 30 entries, newest first) ===
${healthSection}

=== MEDICINE ADHERENCE ANALYSIS (last 60 days) ===
${adherenceSection}

Overall Adherence Rate (last 60 days): ${adherenceRate !== null ? adherenceRate + '%' : 'N/A'}

=== YOUR INSTRUCTIONS ===
1. You MUST base all observations on the data above — never make up data.
2. Proactively identify patterns: e.g. "You frequently skip your Night dose of Metformin (18 out of 48 times)."
3. Analyse health trends: flag rising/high sugar levels (>140 mg/dL fasting, >180 post-meal), high BP (>130/80), or unexplained weight changes.
4. Suggest practical, elderly-appropriate diet and lifestyle tips when relevant.
5. Recommend a doctor consultation when: sugar consistently above 180, BP consistently above 140/90, or unexplained symptoms are mentioned.
6. Be warm, empathetic, and simple — avoid medical jargon. Use short sentences.
7. You MUST NOT prescribe, change dosages, or suggest stopping any medicine.
8. If no patient data exists yet, kindly let the user know and offer general healthy ageing tips.
9. Format responses with clear sections using markdown bold and bullet points for readability.`;
  }

  /**
   * Creates a LlamaChatSession with the loaded model.
   */
  private async createLlamaSession(): Promise<LlamaChatSession> {
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath: this.modelPath });
    const context = await model.createContext();
    return new LlamaChatSession({ contextSequence: context.getSequence() });
  }


  /**
   * Returns an async iterable of text chunks from Gemini.
   */
  async *streamChat(
    patientId: string,
    messages: ChatMessage[],
  ): AsyncIterable<string> {

    const systemPrompt = await this.buildSystemPrompt(patientId);

    // Build a full prompt for the local model, including system instruction and message history.
    const promptLines: string[] = [];
    // System prompt at the beginning
    promptLines.push(systemPrompt);
    // Append conversation history
    for (const msg of messages) {
      const roleLabel = msg.role === 'assistant' ? 'Assistant' : 'User';
      promptLines.push(`${roleLabel}: ${msg.content}`);
    }
    const fullPrompt = promptLines.join('\n');

    // Use Llama session for streaming response
    const session = await this.createLlamaSession();
    const stream = await session.prompt(fullPrompt);
    for await (const chunk of stream) {
      const text = typeof chunk === 'string' ? chunk : ((chunk as any).text ?? '');
      if (text) {
        yield text;
      }
    }
  }
}
