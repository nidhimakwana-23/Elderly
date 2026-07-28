import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Activity } from 'lucide-react';
import { HealthCheckSchema, type HealthCheck, type CreateHealthCheckDto } from '../types/health-check';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateHealthCheckDto) => void;
  initialData?: HealthCheck | null;
}

export function HealthCheckFormModal({ isOpen, onClose, onSave, initialData }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<HealthCheck>({
    resolver: zodResolver(HealthCheckSchema) as any,
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        date: new Date().toISOString().split('T')[0],
        sugar_level: undefined,
        weight: undefined,
        blood_pressure: '',
        blood_level: '',
        bmi: undefined,
        notes: '',
      });
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  const onSubmit = (data: HealthCheck) => {
    // Convert string inputs back to numbers if necessary (react-hook-form valueAsNumber handles most)
    onSave(data as unknown as CreateHealthCheckDto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Activity size={24} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">
              {initialData ? 'Edit Health Record' : 'Log Health Metric'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-surface-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <input type="date" {...register('date')} className="input-field" />
              {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Blood Pressure (mmHg)</label>
              <input {...register('blood_pressure')} className="input-field" placeholder="e.g. 120/80" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Blood Sugar (mg/dL)</label>
              <input type="number" step="0.1" {...register('sugar_level', { valueAsNumber: true })} className="input-field" placeholder="e.g. 95" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Weight (kg)</label>
              <input type="number" step="0.1" {...register('weight', { valueAsNumber: true })} className="input-field" placeholder="e.g. 70.5" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">BMI</label>
              <input type="number" step="0.1" {...register('bmi', { valueAsNumber: true })} className="input-field" placeholder="e.g. 24.5" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Blood Level / SpO2</label>
              <input {...register('blood_level')} className="input-field" placeholder="e.g. 98%" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Notes & Observations</label>
            <textarea {...register('notes')} className="input-field min-h-[80px]" placeholder="How was the patient feeling?"></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500">
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
