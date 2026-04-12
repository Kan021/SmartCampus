import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createItem, listItems, getItem,
  claimItem, updateItem, deleteItem,
  addImage, deleteImage,
} from '../controllers/lostFoundController';

const router = Router();

router.use(authenticate);

router.get('/',                          listItems);
router.post('/',                         createItem);
router.get('/:id',                       getItem);
router.put('/:id',                       updateItem);
router.delete('/:id',                    deleteItem);
router.patch('/:id/claim',               claimItem);
router.post('/:id/images',               addImage);
router.delete('/:id/images/:imageId',    deleteImage);

export default router;
