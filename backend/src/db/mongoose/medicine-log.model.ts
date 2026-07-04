/* 
 * Mongoose Model for Medicine Logs
 * You can use this once you migrate from the in-memory repository to MongoDB.
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicineLog extends Document {
  medicineId: mongoose.Types.ObjectId;
  elderlyId: mongoose.Types.ObjectId;
  medicineName: string;
  dosage: string;
  scheduledDate: string;
  scheduledTime: string;
  takenTime: string | null;
  status: 'Pending' | 'Taken' | 'Missed';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineLogSchema: Schema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  elderlyId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Or 'FamilyProfile' depending on your design
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  scheduledDate: { type: String, required: true },
  scheduledTime: { type: String, required: true },
  takenTime: { type: String, default: null },
  status: {
    type: String,
    enum: ['Pending', 'Taken', 'Missed'],
    default: 'Pending',
    required: true
  },
  remarks: { type: String, required: false },
}, { timestamps: true });

export const MedicineLogModel = mongoose.model<IMedicineLog>('MedicineLog', MedicineLogSchema);
