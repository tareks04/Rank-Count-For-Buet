import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bd.tarek.pcmrankestimator',
  appName: 'PCM Nationwide Rank Estimator',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
