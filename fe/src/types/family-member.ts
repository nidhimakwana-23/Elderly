export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation: string;
}

export interface CreateFamilyProfileInput {
  fullName: string;
  birthDate: string;
  email: string;
  password?: string;
  medicalConditions: string[];
  emergencyContacts: EmergencyContactInput[];
}

export interface FamilyProfile {
  id: string;
  userId: string;
  linkedToUserId: string;
  medicalCondition: string;
  emergencyContacts: string[];
  /** Enriched from the User record by the backend — always present for valid profiles. */
  fullName?: string;
  /** Enriched from the User record by the backend — always present for valid profiles. */
  email?: string;
}
