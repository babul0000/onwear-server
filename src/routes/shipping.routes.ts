import { Router } from 'express';
import { sendSuccessResponse } from '../utils/response';
import { SettingService } from '../services/setting/setting.service';

const router = Router();

router.get(
  '/rates',
  async (_req, res, next) => {
    try {
      const settings = await SettingService.getSettings();
      sendSuccessResponse(res, 200, 'Shipping rates retrieved successfully', {
        insideDhaka: settings.shippingInsideDhaka,
        outsideDhaka: settings.shippingOutsideDhaka
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

