export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:4000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  mongodbUri: process.env.MONGODB_URI as string,

  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  },

  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    webhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH,
  },
});
