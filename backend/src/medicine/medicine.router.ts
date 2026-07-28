import { Router } from 'express';
import { MedicineController } from './medicine.controller.js';
import { MedicineService } from './medicine.service.js';
import { MemoryMedicineRepository } from '../db/memory/memory.medicine.repository.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// In a real app with DI, you'd inject this. We use the memory repo directly here.
const medicineRepo = new MemoryMedicineRepository();
const medicineService = new MedicineService(medicineRepo);
const medicineController = new MedicineController(medicineService);

// Apply auth middleware to all medicine routes
router.use(requireAuth);

/**
 * @openapi
 * /api/medicines:
 *   post:
 *     summary: Create a new medicine
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Medicine created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', medicineController.createMedicine);

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
 *       401:
 *         description: Unauthorized
 */
router.get('/', medicineController.getMedicines);

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
 *     responses:
 *       200:
 *         description: Medicine updated successfully
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

export { router as medicineRouter };
