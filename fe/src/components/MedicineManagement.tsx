import { useState } from 'react';
import { Pill, Search, Plus, Calendar, Clock, Edit2, Trash2, BellRing } from 'lucide-react';
import { MedicineFormModal } from './MedicineFormModal';
import type { Medicine, CreateMedicineDto } from '../types/medicine';
import { format } from 'date-fns';
import { useGetMedicines } from '../hooks/medicines/useGetMedicines';
import { useCreateMedicine } from '../hooks/medicines/useCreateMedicine';
import { useUpdateMedicine } from '../hooks/medicines/useUpdateMedicine';
import { useDeleteMedicine } from '../hooks/medicines/useDeleteMedicine';

import { useFamilyMember } from '../context/FamilyMemberContext';

export function MedicineManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed' | 'Upcoming' | 'Expired'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // ── Active Family Member Context ────────────────────────────────────────────
  const { activeMemberId, activeMemberName, isSelf } = useFamilyMember();

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: medicines = [], isLoading } = useGetMedicines(activeMemberId);
  const createMutation = useCreateMedicine();
  const updateMutation = useUpdateMedicine();
  const deleteMutation = useDeleteMedicine();

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = async (data: CreateMedicineDto) => {
    const payload = { ...data, patient_id: activeMemberId };
    if (editingMedicine?.id) {
      await updateMutation.mutateAsync({ id: editingMedicine.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
    setEditingMedicine(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this medicine?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const filteredMedicines = medicines
    .filter((m) => m.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((m) => (filter === 'All' ? true : m.status === filter));

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Medicine Management</h1>
          <p className="text-slate-500 mt-1">
            Keep track of medications and schedules{!isSelf && <span className="text-indigo-600 font-semibold ml-1.5">for {activeMemberName}</span>}.
          </p>
        </div>
        <button
          onClick={() => { setEditingMedicine(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2"
          disabled={isMutating}
        >
          <Plus size={20} />
          <span>Add Medicine</span>
        </button>
      </div>

      <div className="card space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {(['All', 'Active', 'Completed', 'Upcoming', 'Expired'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'bg-surface-50 text-slate-600 border border-surface-200 hover:bg-surface-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="bg-primary-50 p-6 rounded-full mb-4">
              <Pill size={48} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No medicines found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              {searchQuery
                ? "We couldn't find any medicines matching your search."
                : "You haven't added any medicines yet. Get started by adding your first medication."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { setEditingMedicine(null); setIsModalOpen(true); }}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus size={18} /> Add Your First Medicine
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedicines.map((medicine) => (
              <div
                key={medicine.id}
                className="border border-surface-200 rounded-2xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2.5 rounded-xl text-primary-600">
                      <Pill size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg leading-tight">
                        {medicine.medicine_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {medicine.dosage} • {medicine.strength || medicine.medicine_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingMedicine(medicine); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(medicine.id!)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 flex-grow">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={16} className="text-slate-400" />
                    <span>{medicine.frequency}</span>
                  </div>
                  {medicine.timing && medicine.timing.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      <span>{medicine.timing.join(', ')}</span>
                    </div>
                  )}
                  {medicine.reminder_enabled && (
                    <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 py-1.5 px-3 rounded-lg font-medium inline-flex mt-2">
                      <BellRing size={14} />
                      <span>Reminder Active</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-surface-100 flex justify-between items-center text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full font-medium ${
                      medicine.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : medicine.status === 'Upcoming'
                        ? 'bg-yellow-100 text-yellow-700'
                        : medicine.status === 'Completed'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {medicine.status}
                  </span>
                  <span className="text-slate-500">
                    Starts {format(new Date(medicine.start_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MedicineFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingMedicine}
      />
    </div>
  );
}
