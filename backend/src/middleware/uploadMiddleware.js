import multer from 'multer';

const storage = multer.memoryStorage();

const cvFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are accepted for CV uploads.'), false);
  }
};

const imageFileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG and PNG image files are accepted.'), false);
  }
};

export const uploadCv = multer({
  storage,
  fileFilter: cvFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
}).single('file');

export const uploadPainting = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for high-res art
}).single('file');

export const uploadBlog = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB per image
}).array('files', 3); // Max 3 banner/inline images

export const uploadPortfolio = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB per image
}).array('files', 7); // Max 7 images for portfolio projects
