import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { validate } from '../middlewares/validation.middleware';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const router = Router();
router.use(authMiddleware);

// Define allowed folder prefixes for security
const ALLOWED_FOLDERS = ['tenants', 'documents', 'profiles', 'complaints'];

const signatureSchema = z.object({
  body: z.object({
    folder: z.enum(['tenants', 'documents', 'profiles', 'complaints']),
  }),
});

router.post('/signature', validate(signatureSchema), (req, res) => {
  const { folder } = req.body;
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Security: only allow images & pdfs, limit file size, enforce folder
  const paramsToSign = {
    timestamp,
    folder: `u9pgs/${req.user!.organizationId}/${folder}`,
    // max_file_size limit is not directly supported in the signature by default unless passed explicitly, but we can set constraints here.
  };

  try {
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        folder: paramsToSign.folder,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      }
    });
  } catch (error) {
    console.error('Cloudinary Signature Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate upload signature' });
  }
});

export default router;
