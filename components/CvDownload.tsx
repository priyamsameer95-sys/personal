import Icon from '@/components/Icon';
import cvFile from '../content/cv-download.json';

export const CV_DOWNLOAD_URL = `${cvFile.publicPath}?v=${cvFile.sha256.slice(0, 12)}`;

export default function CvDownload({ className = '' }: { className?: string }) {
  return <a href={CV_DOWNLOAD_URL} download="Priyam_Sameer_CV.pdf" className={className}>
    Download CV
    <Icon name="download" />
  </a>;
}
