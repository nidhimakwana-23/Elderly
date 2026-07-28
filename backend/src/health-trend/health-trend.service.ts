import type { IHealthCheckRepository } from '../db/health-check.repository.js';
import type { IMedicineLogsRepository } from '../db/medicine-logs.repository.js';
import type { IMedicineRepository } from '../db/medicine.repository.js';
import type { IPrescriptionRepository } from '../db/prescription.repository.js';
import type { IAppointmentRepository } from '../db/appointment.repository.js';
import type { HealthCheck } from '../health-check/health-check.types.js';

export interface PatientHealthSummary {
  patient_id: string;
  /** All vital sign records, newest first */
  healthChecks: HealthCheck[];
  /** Aggregated vital trends (latest values + computed averages) */
  vitalTrends: {
    avgSugarLevel:    number | null;
    avgWeight:        number | null;
    avgBmi:           number | null;
    latestBP:         string | null;
    latestBloodLevel: string | null;
  };
  /** All prescriptions issued for this patient */
  prescriptions: any[];
  /** All medicines (schedules) for this patient */
  medicines: any[];
  /** Medicine adherence logs */
  medicineLogs: any[];
  /** Appointment history */
  appointments: any[];
}

export class HealthTrendService {
  constructor(
    private readonly healthCheckRepo: IHealthCheckRepository,
    private readonly medicineLogsRepo: IMedicineLogsRepository,
    private readonly medicineRepo: IMedicineRepository,
    private readonly prescriptionRepo: IPrescriptionRepository,
    private readonly appointmentRepo: IAppointmentRepository,
  ) {}

  /**
   * Aggregate the full health picture for a patient.
   * Optionally filter health-checks by date window.
   */
  async getPatientSummary(
    patientId: string,
    options?: { from?: string; to?: string },
  ): Promise<PatientHealthSummary> {
    const [healthChecks, prescriptions, medicines, medicineLogs, appointments] =
      await Promise.all([
        this.healthCheckRepo.findAll(patientId),
        this.prescriptionRepo.findByPatientId(patientId),
        this.medicineRepo.findAll(patientId),
        this.medicineLogsRepo.findByElderlyId(patientId),
        this.appointmentRepo.findByPatientId(patientId),
      ]);

    // Optional date filtering for health checks
    let filteredChecks = healthChecks;
    if (options?.from) {
      filteredChecks = filteredChecks.filter((hc) => hc.date >= options.from!);
    }
    if (options?.to) {
      filteredChecks = filteredChecks.filter((hc) => hc.date <= options.to!);
    }
    // Sort newest first
    filteredChecks.sort((a, b) => (b.date > a.date ? 1 : -1));

    // Compute trends from health checks
    const vitalTrends = this.computeTrends(filteredChecks);

    return {
      patient_id:   patientId,
      healthChecks: filteredChecks,
      vitalTrends,
      prescriptions,
      medicines,
      medicineLogs,
      appointments,
    };
  }

  /** Compute average vitals from a list of health checks. */
  private computeTrends(checks: HealthCheck[]) {
    if (checks.length === 0) {
      return {
        avgSugarLevel: null,
        avgWeight: null,
        avgBmi: null,
        latestBP: null,
        latestBloodLevel: null,
      };
    }

    const withSugar  = checks.filter((c) => c.sugar_level   != null);
    const withWeight = checks.filter((c) => c.weight         != null);
    const withBmi    = checks.filter((c) => c.bmi            != null);

    const avg = (nums: number[]) =>
      nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;

    return {
      avgSugarLevel:    avg(withSugar.map((c)  => c.sugar_level!)),
      avgWeight:        avg(withWeight.map((c) => c.weight!)),
      avgBmi:           avg(withBmi.map((c)   => c.bmi!)),
      latestBP:         checks.find((c) => c.blood_pressure)?.blood_pressure   ?? null,
      latestBloodLevel: checks.find((c) => c.blood_level)?.blood_level         ?? null,
    };
  }
}
