import removeImports from 'next-remove-imports';

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default removeImports()(nextConfig);
