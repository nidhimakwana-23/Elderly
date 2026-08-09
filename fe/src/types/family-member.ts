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
  fullName?: string;
  email?: string;
}
