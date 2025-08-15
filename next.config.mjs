/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
        'puppeteer-extra', 
        'puppeteer-extra-plugin-stealth',
        'puppeteer-extra-plugin-recaptcha',
        'puppeteer-extra-plugin-proxy'
    ],
    serverActions: {
      bodySizeLimit: '10000mb',
    },
  }
};

export default nextConfig;
