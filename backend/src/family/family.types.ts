export interface FamilyProfile {
  id: string;
  userId: string; // The family member's own User ID
  linkedToUserId: string; // The ID of the normal user who created this profile
  medicalCondition: string;
  emergencyContacts: string[];
}

export interface CreateFamilyProfileInput {
  fullName: string;
  birthDate: string;
  email: string;
  password?: string;
  medicalConditions: string[];
  emergencyContacts: {
    name: string;
    phone: string;
    relation: string;
  }[];
}
