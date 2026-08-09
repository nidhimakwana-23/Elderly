import { Router } from 'express';
import { MedicineController } from './medicine.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePatientAccess } from '../middleware/patient-access.middleware.js';
import type { IUserRepository } from '../db/user.repository.js';

export function createMedicineRouter(
  medicineController: MedicineController,
  userRepository: IUserRepository,
): Router {
  const router = Router();

  // Apply auth middleware to all medicine routes
  router.use(requireAuth);
  const patientAccess = requirePatientAccess(userRepository);

  /**
   * @openapi
   * /api/medicines:
   *   post:
   *     summary: Create a new medicine
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateMedicineDto'
   *     responses:
   *       201:
   *         description: Medicine created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Medicine'
   *       401:
   *         description: Unauthorized
   */
  router.post('/', patientAccess, medicineController.createMedicine);

  /**
   * @openapi
   * /api/medicines:
   *   get:
   *     summary: Get all medicines
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of medicines
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Medicine'
   *       401:
   *         description: Unauthorized
   */
  router.get('/', patientAccess, medicineController.getMedicines);

  /**
   * @openapi
   * /api/medicines/{id}:
   *   get:
   *     summary: Get a medicine by id
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Medicine details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Medicine'
   *       404:
   *         description: Not found
   */
  router.get('/:id', medicineController.getMedicineById);

  /**
   * @openapi
   * /api/medicines/{id}:
   *   put:
   *     summary: Update a medicine
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateMedicineDto'
   *     responses:
   *       200:
   *         description: Medicine updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Medicine'
   *       404:
   *         description: Not found
   */
  router.put('/:id', medicineController.updateMedicine);

  /**
   * @openapi
   * /api/medicines/{id}:
   *   delete:
   *     summary: Delete a medicine
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Medicine deleted successfully
   *       404:
   *         description: Not found
   */
  router.delete('/:id', medicineController.deleteMedicine);

  return router;
}
