import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { MedicineSchema, type Medicine, type CreateMedicineDto } from '../types/medicine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMedicineDto) => void;
  initialData?: Medicine | null;
}

const MEDICINE_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Other'] as const;
const FREQUENCIES = ['Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily', 'Every 6 Hours', 'Weekly', 'Custom'] as const;
const TIMINGS = ['Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Before Sleep'];

export function MedicineFormModal({ isOpen, onClose, onSave, initialData }: Props) {
  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<Medicine>({
    resolver: zodResolver(MedicineSchema) as any,
    defaultValues: initialData || {
      medicine_type: 'Tablet',
      frequency: 'Once Daily',
      timing: [],
      reminder_enabled: false,
      reminder_times: [],
      status: 'Active',
      quantity: 1,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        medicine_type: 'Tablet',
        frequency: 'Once Daily',
        timing: [],
        reminder_enabled: false,
        reminder_times: [],
        status: 'Active',
        quantity: 1,
      });
    }
  }, [isOpen, initialData, reset]);

  const reminderEnabled = watch('reminder_enabled');
  const selectedTimings = watch('timing') || [];

  if (!isOpen) return null;

  const toggleTiming = (time: string) => {
    if (selectedTimings.includes(time)) {
      setValue('timing', selectedTimings.filter(t => t !== time));
    } else {
      setValue('timing', [...selectedTimings, time]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <h2 className="text-xl font-semibold text-slate-800">
            {initialData ? 'Edit Medicine' : 'Add New Medicine'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-surface-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => onSave(data as unknown as CreateMedicineDto))} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Medicine Name *</label>
              <input {...register('medicine_name')} className="input-field" placeholder="e.g. Amoxicillin" />
              {errors.medicine_name && <p className="text-red-500 text-xs">{errors.medicine_name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Dosage *</label>
              <input {...register('dosage')} className="input-field" placeholder="e.g. 1 pill" />
              {errors.dosage && <p className="text-red-500 text-xs">{errors.dosage.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Medicine Type</label>
              <select {...register('medicine_type')} className="input-field">
                {MEDICINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Strength</label>
              <input {...register('strength')} className="input-field" placeholder="e.g. 500mg" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Frequency</label>
              <select {...register('frequency')} className="input-field">
                {FREQUENCIES.map(freq => <option key={freq} value={freq}>{freq}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Quantity / Refills</label>
              <input type="number" {...register('quantity', { valueAsNumber: true })} className="input-field" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Start Date *</label>
              <input type="date" {...register('start_date')} className="input-field" />
              {errors.start_date && <p className="text-red-500 text-xs">{errors.start_date.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <input type="date" {...register('end_date')} className="input-field" />
              {errors.end_date && <p className="text-red-500 text-xs">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Timing</label>
            <div className="flex flex-wrap gap-2">
              {TIMINGS.map(time => (
                <button
                  type="button"
                  key={time}
                  onClick={() => toggleTiming(time)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    selectedTimings.includes(time) 
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-white border-surface-200 text-slate-600 hover:bg-surface-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
            <input type="checkbox" id="reminder_enabled" {...register('reminder_enabled')} className="w-5 h-5 text-primary-600 rounded border-surface-300 focus:ring-primary-500" />
            <label htmlFor="reminder_enabled" className="text-sm font-medium text-slate-700">Enable Reminders</label>
          </div>

          {reminderEnabled && (
            <div className="space-y-1 p-4 border border-primary-100 bg-primary-50 rounded-xl">
              <label className="text-sm font-medium text-primary-800">Reminder Times</label>
              <input 
                type="text" 
                placeholder="e.g. 08:00 AM, 08:00 PM (comma separated)" 
                className="input-field"
                onChange={(e) => {
                  const times = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setValue('reminder_times', times);
                }}
                defaultValue={initialData?.reminder_times?.join(', ')}
              />
              {errors.reminder_times && <p className="text-red-500 text-xs">{errors.reminder_times.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Notes / Instructions</label>
            <textarea {...register('notes')} className="input-field min-h-[80px]" placeholder="Special instructions..."></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Medicine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
