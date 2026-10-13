export const CV_DOWNLOAD_URL = '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf';

export default function CvDownload({ className = '' }: { className?: string }) {
  return <a href={CV_DOWNLOAD_URL} download="Priyam_Sameer_CV.pdf" className={className}>
    Download CV
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" /></svg>
  </a>;
}
