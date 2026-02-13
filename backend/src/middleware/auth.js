import admin, { initializeFirebaseAdmin } from '../config/firebaseAdmin.js';
import { ApiError } from '../utils/errors.js';

export const requireAuth = async (req, _res, next) => {
  try {
    initializeFirebaseAdmin();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Unauthorized', 'Missing or invalid authorization token.');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Unauthorized', 'Token verification failed.'));
  }
};
