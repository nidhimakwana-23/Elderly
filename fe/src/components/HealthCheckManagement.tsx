import { useState, useMemo } from 'react';
import { Activity, Plus, HeartPulse, Scale, Droplet, Search, Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { HealthCheckFormModal } from './HealthCheckFormModal';
import type { HealthCheck, CreateHealthCheckDto } from '../types/health-check';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useGetHealthChecks } from '../hooks/health-checks/useGetHealthChecks';
import { useCreateHealthCheck } from '../hooks/health-checks/useCreateHealthCheck';
import { useUpdateHealthCheck } from '../hooks/health-checks/useUpdateHealthCheck';
import { useDeleteHealthCheck } from '../hooks/health-checks/useDeleteHealthCheck';

export function HealthCheckManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthCheck | null>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const { user } = useAuth();
  const patientId = user?.id;

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: records = [], isLoading } = useGetHealthChecks(patientId);
  const createMutation = useCreateHealthCheck(patientId);
  const updateMutation = useUpdateHealthCheck(patientId);
  const deleteMutation = useDeleteHealthCheck(patientId);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async (data: CreateHealthCheckDto) => {
    const payload = { ...data, patient_id: patientId };

    // Clean up NaN values before sending to backend
    Object.keys(payload).forEach((key) => {
      const k = key as keyof typeof payload;
      if (typeof payload[k] === 'number' && isNaN(payload[k] as number)) {
        (payload as Record<string, unknown>)[k] = undefined;
      }
    });

    if (editingRecord?.id) {
      await updateMutation.mutateAsync({ id: editingRecord.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload as CreateHealthCheckDto);
    }
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this health record?')) return;
    await deleteMutation.mutateAsync(id);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredRecords = records
    .filter(
      (r) =>
        (r.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date.includes(searchQuery),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const chartData = useMemo(() => {
    return [...filteredRecords].reverse().map((r) => ({
      date: format(parseISO(r.date), 'MMM dd'),
      weight: r.weight,
      sugar: r.sugar_level,
    }));
  }, [filteredRecords]);

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <span className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-600">
              <Activity size={28} />
            </span>
            Health Metrics
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Monitor vitals and track progress over time.</p>
        </div>
        <button
          onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
          disabled={isMutating}
          className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={20} />
          <span className="font-semibold">Log Vitals</span>
        </button>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Health Trends</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line yAxisId="left" type="monotone" name="Weight (kg)" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" name="Blood Sugar" dataKey="sugar" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-sm text-white flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-medium opacity-90 mb-1">Latest Reading</h3>
              <p className="text-3xl font-bold">
                {filteredRecords[0]?.date
                  ? format(parseISO(filteredRecords[0].date), 'MMMM do, yyyy')
                  : 'No records'}
              </p>
            </div>
            {filteredRecords[0] && (
              <div className="space-y-4 mt-8">
                <div className="flex items-center justify-between bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Scale size={20} className="opacity-80" />
                    <span>Weight</span>
                  </div>
                  <span className="font-semibold text-lg">{filteredRecords[0].weight || '--'} kg</span>
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Droplet size={20} className="opacity-80" />
                    <span>Blood Sugar</span>
                  </div>
                  <span className="font-semibold text-lg">{filteredRecords[0].sugar_level || '--'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">History</h2>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search notes or dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="bg-indigo-50 p-6 rounded-full mb-4">
              <Activity size={48} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No health records found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              Start tracking your health metrics to see trends and maintain a healthy lifestyle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="group bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-start mb-6 relative">
                  <div>
                    <span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-3 py-1 rounded-full">
                      {format(parseISO(record.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingRecord(record); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id!)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <HeartPulse size={16} className="text-rose-400" /> BP
                    </div>
                    <p className="font-semibold text-slate-800">{record.blood_pressure || '--'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Scale size={16} className="text-indigo-400" /> Weight
                    </div>
                    <p className="font-semibold text-slate-800">
                      {record.weight ? `${record.weight} kg` : '--'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Droplet size={16} className="text-cyan-400" /> Sugar
                    </div>
                    <p className="font-semibold text-slate-800">{record.sugar_level || '--'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Activity size={16} className="text-emerald-400" /> BMI
                    </div>
                    <p className="font-semibold text-slate-800">{record.bmi || '--'}</p>
                  </div>
                </div>

                {record.notes && (
                  <div className="mt-6 pt-4 border-t border-slate-100 relative">
                    <p className="text-sm text-slate-600 italic">"{record.notes}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <HealthCheckFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingRecord}
      />
    </div>
  );
}
