import React, { useState } from 'react';
import { X, UserPlus, Heart, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateFamilyProfileInput, EmergencyContactInput } from '../types/family-member';
import { useCreateFamilyMember } from '../hooks/family/useCreateFamilyMember';

interface AddFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMemberId: string, name: string) => void;
}

export const AddFamilyMemberModal: React.FC<AddFamilyMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Removed errorMsg state; using toast for notifications

  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 State
  const [conditionInput, setConditionInput] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);

  // Step 3 State
  const [contacts, setContacts] = useState<EmergencyContactInput[]>([
    { name: '', phone: '', relation: '' },
  ]);

  const createMemberMutation = useCreateFamilyMember();

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(1);
    setFullName('');
    setBirthDate('');
    setEmail('');
    setPassword('');
    setConditionInput('');
    setMedicalConditions([]);
    setContacts([{ name: '', phone: '', relation: '' }]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Condition Tags Handler
  const handleAddCondition = () => {
    const trimmed = conditionInput.trim();
    if (trimmed && !medicalConditions.includes(trimmed)) {
      setMedicalConditions([...medicalConditions, trimmed]);
      setConditionInput('');
    }
  };

  const handleRemoveCondition = (cond: string) => {
    setMedicalConditions(medicalConditions.filter((c) => c !== cond));
  };

  // Contacts Handler
  const handleAddContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { name: '', phone: '', relation: '' }]);
    }
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof EmergencyContactInput, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  // Step Nav & Validation
  const handleNext = () => {
    // No need to clear errorMsg; using toast
    if (step === 1) {
      if (!fullName.trim()) {
        toast.error('Full Name is required.');
        return;
      }
      if (!birthDate.trim()) {
        toast.error('Date of Birth is required.');
        return;
      }
      // Validate age >= 18
      const birth = new Date(birthDate);
      const now = new Date();
      const age = now.getFullYear() - birth.getFullYear() - ((now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) ? 1 : 0);
      if (age < 45) {
        toast.error('You must be at least 45 years old.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('A valid email address is required.');
        return;
      }
      // Password complexity: >=8, uppercase, number, special character
      const passwordValid = password && password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[\W_]/.test(password);
      if (!passwordValid) {
        toast.error('Password must be at least 8 characters, include an uppercase letter, a number, and a special character.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    // No toast needed on back navigation
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // No need to reset error state; toast handles errors

    // Filter valid contacts
    const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim());

    const payload: CreateFamilyProfileInput = {
      fullName: fullName.trim(),
      birthDate: birthDate.trim(),
      email: email.trim(),
      password,
      medicalConditions,
      emergencyContacts: validContacts,
    };

    try {
      const createdProfile = await createMemberMutation.mutateAsync(payload);
      if (onSuccess) {
        onSuccess(createdProfile.userId, fullName.trim());
      }
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create family member profile.';
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add Family Member</h2>
              <p className="text-xs text-indigo-100">Create a profile to manage their health & meds</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <span>Personal Info</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <span>Medical History</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <span>Contacts</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Robert Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="member@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Login Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  This will allow the family member to log in directly if needed.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Medical Profile */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Medical Conditions
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="e.g. Diabetes Type 2, Hypertension"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCondition();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-4 py-2.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-xl font-medium text-sm transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Tags List */}
                <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {medicalConditions.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No medical conditions added yet. Type above and click Add.</span>
                  ) : (
                    medicalConditions.map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-sm"
                      >
                        <Heart size={12} className="fill-white/30" />
                        {cond}
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cond)}
                          className="hover:text-red-200 transition-colors ml-1"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Emergency Contacts */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Emergency Contacts
                </label>
                {contacts.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Contact
                  </button>
                )}
              </div>

              {contacts.map((contact, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Contact #{idx + 1}</span>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Name (e.g. Jane Smith)"
                      value={contact.name}
                      onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (e.g. +1234567890)"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Daughter)"
                      value={contact.relation}
                      onChange={(e) => handleContactChange(idx, 'relation', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-1"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createMemberMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {createMemberMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                <span>Save & Create Profile</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
