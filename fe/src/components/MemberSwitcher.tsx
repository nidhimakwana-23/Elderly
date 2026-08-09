import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Plus, Check, HeartPulse, Users } from 'lucide-react';
import { useFamilyMember } from '../context/FamilyMemberContext';
import { useGetFamilyMembers } from '../hooks/family/useGetFamilyMembers';
import { useAuth } from '../context/AuthContext';
import { AddFamilyMemberModal } from './AddFamilyMemberModal';

export const MemberSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { activeMemberId, activeMemberName, isSelf, setActiveMember } = useFamilyMember();
  const { data: familyMembers = [], isLoading } = useGetFamilyMembers();

  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSelf = () => {
    if (user?.id) {
      setActiveMember(user.id, 'Myself');
    }
    setIsOpen(false);
  };

  const handleSelectMember = (userId: string, name: string) => {
    setActiveMember(userId, name);
    setIsOpen(false);
  };

  // Helper for avatar initials
  const getInitial = (name: string) => {
    if (!name || name === 'Myself') return 'M';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Chip Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-xs"
        title="Switch Profile / Family Member"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
          isSelf 
            ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white' 
            : 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white'
        }`}>
          {getInitial(activeMemberName)}
        </div>
        <div className="flex flex-col text-left leading-none pr-1">
          <span className="text-xs font-bold text-slate-800 tracking-tight">
            {activeMemberName}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {isSelf ? 'Personal View' : 'Family View'}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users size={12} /> Viewing Health For
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {/* Self Option */}
            <button
              onClick={handleSelectSelf}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                isSelf ? 'bg-indigo-50/70 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <User size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    Myself <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                  </div>
                  <div className="text-xs text-slate-400">{user?.email}</div>
                </div>
              </div>
              {isSelf && <Check size={16} className="text-indigo-600 shrink-0" />}
            </button>

            {/* Family Members Section */}
            {familyMembers.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 mt-1">
                  Family Members
                </div>
                {familyMembers.map((member) => {
                  const memberName = member.fullName || `Family Member (${member.userId.slice(0, 6)})`;
                  const isSelected = activeMemberId === member.userId;
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.userId, memberName)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                        isSelected ? 'bg-emerald-50/70 text-teal-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {getInitial(memberName)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-semibold truncate">{memberName}</div>
                          {member.medicalCondition && (
                            <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <HeartPulse size={10} className="text-rose-400 shrink-0" />
                              <span className="truncate">{member.medicalCondition}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="text-teal-600 shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}

            {isLoading && (
              <div className="py-4 text-center text-xs text-slate-400">Loading family members...</div>
            )}
          </div>

          {/* Add Family Member Footer Action */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} /> Add Family Member
            </button>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      <AddFamilyMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newMemberId, name) => {
          setActiveMember(newMemberId, name);
        }}
      />
    </div>
  );
};
