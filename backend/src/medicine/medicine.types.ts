export interface Medicine {
  id: string;
  patient_id: string;
  medicine_name: string;
  medicine_type: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Drops' | 'Cream' | 'Other';
  dosage: string;
  strength?: string;
  frequency: 'Once Daily' | 'Twice Daily' | 'Three Times Daily' | 'Four Times Daily' | 'Every 6 Hours' | 'Weekly' | 'Custom';
  timing: string[];
  start_date: string;
  end_date?: string;
  reminder_enabled: boolean;
  reminder_times: string[];
  quantity?: number;
  doctor_name?: string;
  prescription_number?: string;
  notes?: string;
  status: 'Active' | 'Completed' | 'Upcoming' | 'Expired';
  created_at: string;
  updated_at: string;
}

export type CreateMedicineDto = Omit<Medicine, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMedicineDto = Partial<CreateMedicineDto>;
