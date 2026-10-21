import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  GH_CLIENT_ID: process.env.GH_CLIENT_ID || 'mock_github_client_id',
  GH_CLIENT_SECRET: process.env.GH_CLIENT_SECRET || 'mock_github_client_secret',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_dev_net_matcher_32chars!',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_super_secure_32char!',
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || crypto.createHash('sha256').update('mentorship_encryption_master_key_2026').digest('hex'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SYNC_INTERVAL_HOURS: 12,
  MATCH_AFFINITY_THRESHOLD: 0.65,
};
