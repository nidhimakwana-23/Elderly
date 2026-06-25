export interface FamilyProfile {
  id: string;
  userId: string; // The family member's own User ID
  linkedToUserId: string; // The ID of the normal user who created this profile
  medicalCondition: string;
  emergencyContacts: string[];
}

export interface CreateFamilyProfileInput {
  fullName: string;
  birthdate: string;
  email: string;
  password?: string;
  medicalCondition: string;
  emergencyContacts: string[];
}
