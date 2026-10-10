import { Vibration, Platform } from 'react-native';

// Audio and Notifications modules initialized safely with try/catch to prevent native runtime crashes
let audioModule: any = null;
let audioModuleChecked = false;
let audioPlayerInstance: any = null;
let notificationsModule: any = null;

function getAudioModule() {
  if (audioModuleChecked) return audioModule;
  audioModuleChecked = true;
  try {
    const expoAudio = require('expo-audio');
    audioModule = expoAudio.AudioModule;
    if (audioModule?.setAudioModeAsync) {
      audioModule.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      }).catch(() => {});
    }
  } catch (err) {
    audioModule = null;
  }
  return audioModule;
}

try {
  // Expo notifications module
  notificationsModule = require('expo-notifications');
  if (notificationsModule?.setNotificationHandler) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (err) {
  console.log('ExpoNotifications native modülü yüklenmedi:', err);
}

/**
 * Bildirim geldiğinde çalacak ses
 */
export const playNotificationSound = async () => {
  try {
    const mod = getAudioModule();
    if (mod?.AudioPlayer) {
      if (!audioPlayerInstance) {
        audioPlayerInstance = new mod.AudioPlayer(
          require('../../assets/notification.wav'),
          500,
          false,
          0
        );
      }
      if (audioPlayerInstance) {
        if (typeof audioPlayerInstance.seekTo === 'function') {
          audioPlayerInstance.seekTo(0);
        }
        audioPlayerInstance.play();
        return;
      }
    }
  } catch (error) {
    console.warn('Bildirim sesi çalınamadı:', error);
  }
};

/**
 * Cihaz titreşim uyarısı (saf React Native, yerel modül gerektirmez)
 */
export const triggerHapticAlert = () => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 150, 100, 150]);
    } else {
      Vibration.vibrate();
    }
  } catch (error) {
    console.warn('Titreşim verilemedi:', error);
  }
};

/**
 * Ses ve titreşimi aynı anda tetikleyen ana uyarı fonksiyonu
 */
export const playNotificationAlert = async () => {
  triggerHapticAlert();
  await playNotificationSound();
};

/**
 * Expo yerel/push bildirim izinlerini ve Android kanallarını ayarlar
 */
export const setupPushNotifications = async (): Promise<boolean> => {
  try {
    if (!notificationsModule?.getPermissionsAsync) return false;

    if (Platform.OS === 'android' && notificationsModule.setNotificationChannelAsync) {
      await notificationsModule.setNotificationChannelAsync('default', {
        name: 'Aile Finans Bildirimleri',
        importance: notificationsModule.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await notificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted' && notificationsModule.requestPermissionsAsync) {
      const { status } = await notificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Bildirim izinleri yapılandırılamadı:', error);
    return false;
  }
};

/**
 * Anında yerel bildirim tetikler (uygulama arka plandayken veya ön plandayken)
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  try {
    if (!notificationsModule?.scheduleNotificationAsync) return;
    await notificationsModule.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Yerel bildirim gönderilemedi:', error);
  }
};
