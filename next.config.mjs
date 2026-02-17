/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed when loading dev assets through ngrok tunnels.
  // Keeps Next.js from treating the tunnel origin as unexpected.
  allowedDevOrigins: ['*.ngrok-free.app'],
};

export default nextConfig;

