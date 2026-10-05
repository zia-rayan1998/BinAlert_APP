import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  changePassword,
  forgotPassword,
  forgotSchema,
  login,
  loginSchema,
  logout,
  me,
  resetPassword,
  resetSchema,
  signup,
  signupSchema,
  updateProfile,
  updateProfileSchema,
} from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/signup', authLimiter, validate(signupSchema), signup);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/forgot-password', authLimiter, validate(forgotSchema), forgotPassword);
authRouter.post('/reset-password', authLimiter, validate(resetSchema), resetPassword);

authRouter.get('/me', requireAuth, me);
authRouter.post('/logout', requireAuth, logout);
authRouter.patch('/me', requireAuth, validate(updateProfileSchema), updateProfile);
authRouter.post('/change-password', requireAuth, changePassword);
