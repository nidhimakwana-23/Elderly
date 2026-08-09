import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface ActiveMember {
  id: string;
  name: string;
}

interface FamilyMemberContextValue {
  activeMemberId: string;
  activeMemberName: string;
  isSelf: boolean;
  setActiveMember: (id: string, name: string) => void;
  resetToSelf: () => void;
}

const FamilyMemberContext = createContext<FamilyMemberContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY_ID = 'active_member_id';
const LOCAL_STORAGE_KEY_NAME = 'active_member_name';

export const FamilyMemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const selfId = user?.id ?? '';
  const selfName = 'Myself';

  const [activeMember, setActiveMemberState] = useState<ActiveMember>(() => {
    const savedId = localStorage.getItem(LOCAL_STORAGE_KEY_ID);
    const savedName = localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
    if (savedId && savedName) {
      return { id: savedId, name: savedName };
    }
    return { id: selfId, name: selfName };
  });

  // Sync if selfId changes (e.g. login/logout) and no activeMember is set or saved ID belongs to a previous session
  useEffect(() => {
    if (!activeMember.id && selfId) {
      setActiveMemberState({ id: selfId, name: selfName });
    }
  }, [selfId, activeMember.id]);

  const setActiveMember = useCallback((id: string, name: string) => {
    setActiveMemberState({ id, name });
    localStorage.setItem(LOCAL_STORAGE_KEY_ID, id);
    localStorage.setItem(LOCAL_STORAGE_KEY_NAME, name);
  }, []);

  const resetToSelf = useCallback(() => {
    if (selfId) {
      setActiveMember(selfId, selfName);
    }
  }, [selfId, setActiveMember]);

  const activeMemberId = activeMember.id || selfId;
  const activeMemberName = activeMember.id === selfId ? selfName : activeMember.name;
  const isSelf = activeMemberId === selfId;

  return (
    <FamilyMemberContext.Provider
      value={{
        activeMemberId,
        activeMemberName,
        isSelf,
        setActiveMember,
        resetToSelf,
      }}
    >
      {children}
    </FamilyMemberContext.Provider>
  );
};

export function useFamilyMember(): FamilyMemberContextValue {
  const ctx = useContext(FamilyMemberContext);
  if (!ctx) {
    throw new Error('useFamilyMember must be used within <FamilyMemberProvider>');
  }
  return ctx;
}
