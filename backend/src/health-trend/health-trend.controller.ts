import type { Request, Response } from 'express';
import type { HealthTrendService } from './health-trend.service';

export class HealthTrendController {
  constructor(private readonly healthTrendService: HealthTrendService) {
    this.getPatientSummary = this.getPatientSummary.bind(this);
  }

  /**
   * GET /api/health-trend/:patientId
   * Returns the full health picture for a patient.
   * Optional query params: from=YYYY-MM-DD, to=YYYY-MM-DD
   */
  async getPatientSummary(req: Request, res: Response): Promise<void> {
    try {
      const patientId = req.params['patientId'] as string;
      const from = req.query['from'] as string | undefined;
      const to   = req.query['to']   as string | undefined;

      const options: { from?: string; to?: string } = {};
      if (from) options.from = from;
      if (to)   options.to   = to;

      const summary = await this.healthTrendService.getPatientSummary(patientId, options);
      res.json(summary);
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
}
