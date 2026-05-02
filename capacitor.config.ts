import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter', // Pastikan ini sesuai dengan ID aplikasimu
  appName: 'StudyFlow',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample', // Ikon notifikasi (opsional)
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
};

export default config;