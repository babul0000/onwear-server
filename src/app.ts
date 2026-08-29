import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './config/swagger.json';
import { env } from './config/env';
import { notFoundMiddleware } from './middlewares/notFound.middleware';
import { errorMiddleware } from './middlewares/error.middleware';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import reviewRoutes from './routes/review.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import orderRoutes from './routes/order.routes';
import promotionRoutes from './routes/promotion.routes';
import couponRoutes from './routes/coupon.routes';
import shippingRoutes from './routes/shipping.routes';
import settingRoutes from './routes/setting.routes';
import paymentRoutes from './routes/payment.routes';
import campaignRoutes from './routes/campaign.routes';
import addressRoutes from './routes/address.routes';


const app = express();

// Trust proxy headers under reverse proxies (Cloudflare, Nginx, Vercel)
app.set('trust proxy', 1);

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    error: { code: 'TOO_MANY_REQUESTS' }
  }
});
app.use('/api', limiter);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ShopNest REST API is running successfully',
    data: {
      uptime: process.uptime()
    }
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/addresses', addressRoutes);


// Fallback Middlewares
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
