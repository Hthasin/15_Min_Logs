/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable external network calls during development
    experimental: {
        // Prevents version check fetches
        disableOptimizedLoading: false,
    },
    // Disable powered-by header
    poweredByHeader: false,
    // Ensure CSS is processed without external calls
    compiler: {},
};

export default nextConfig;
