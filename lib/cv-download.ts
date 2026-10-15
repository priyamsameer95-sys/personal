import cvFile from '../content/cv-download.json';

export const CV_DOWNLOAD_URL = `${cvFile.publicPath}?v=${cvFile.sha256.slice(0, 12)}`;
export const CV_DOWNLOAD_FILENAME = 'Priyam_Sameer_CV.pdf';
export const CV_SHA256 = cvFile.sha256;
