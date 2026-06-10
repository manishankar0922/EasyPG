const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary with the credentials you provided
cloudinary.config({
  cloud_name: 'dhpgfhxct',
  api_key: 'YOUR_API_KEY', // ← replace this
  api_secret: 'YOUR_API_SECRET' // ← replace this
});

async function runCloudinaryTest() {
  try {
    console.log('Uploading sample image...');
    
    // 2. Upload an image from Cloudinary's demo domain
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      { public_id: 'onboarding_sample_image' }
    );
    
    console.log('\n--- Upload Successful ---');
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);

    // 3. Get image details directly from the upload response (or could use api.resource)
    console.log('\n--- Image Metadata ---');
    console.log('Width:', uploadResult.width);
    console.log('Height:', uploadResult.height);
    console.log('Format:', uploadResult.format);
    console.log('File Size (bytes):', uploadResult.bytes);

    // 4. Transform the image
    // Generating a transformed version of the image URL using:
    // - f_auto: Automatically selects the best image format based on the requesting browser
    // - q_auto: Automatically adjusts the image quality to reduce file size without losing visual quality
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log('\n--- Transformation ---');
    console.log('Done! Click the link below to see the optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);

  } catch (error) {
    console.error('\nError running script:', error.message);
  }
}

runCloudinaryTest();
