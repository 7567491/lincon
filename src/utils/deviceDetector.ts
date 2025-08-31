// src/utils/deviceDetector.ts
import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface DeviceInfo {
  isIPhone: boolean;
  isAndroid: boolean; 
  isMobile: boolean;
  isDesktop: boolean;
  deviceType: 'iphone' | 'android' | 'mobile' | 'desktop';
  screenSize: {
    width: number;
    height: number;
  };
}

/**
 * 检测设备类型和屏幕信息
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isIPhone = /iphone/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
  const isDesktop = !isMobile;

  // 检测屏幕尺寸
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // 更精确的iPhone检测
  const isIPhoneByScreen = isIPhone && (
    // iPhone各型号典型分辨率检测
    (screenWidth === 375 && screenHeight === 667) || // iPhone 6/7/8
    (screenWidth === 414 && screenHeight === 736) || // iPhone 6/7/8 Plus
    (screenWidth === 375 && screenHeight === 812) || // iPhone X/XS/11 Pro
    (screenWidth === 414 && screenHeight === 896) || // iPhone XR/11/12/13
    (screenWidth === 390 && screenHeight === 844) || // iPhone 12/13 mini
    (screenWidth === 393 && screenHeight === 852) || // iPhone 14
    (screenWidth === 430 && screenHeight === 932) || // iPhone 14 Plus/Pro Max
    // 通用iPhone特征检测
    (isIPhone && screenWidth <= 430 && screenHeight <= 960)
  );

  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  if (isIPhoneByScreen) {
    deviceType = 'iphone';
  } else if (isAndroid) {
    deviceType = 'android';
  } else if (isMobile) {
    deviceType = 'mobile';
  }

  return {
    isIPhone: isIPhoneByScreen,
    isAndroid,
    isMobile,
    isDesktop,
    deviceType,
    screenSize: {
      width: screenWidth,
      height: screenHeight
    }
  };
}

/**
 * 响应式设备检测Hook (Vue Composition API)
 */
export function useDeviceDetection() {
  const deviceInfo = ref<DeviceInfo>(detectDevice());

  const updateDeviceInfo = () => {
    deviceInfo.value = detectDevice();
  };

  onMounted(() => {
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceInfo);
    window.removeEventListener('orientationchange', updateDeviceInfo);
  });

  return {
    deviceInfo,
    isIPhone: computed(() => deviceInfo.value.isIPhone),
    isMobile: computed(() => deviceInfo.value.isMobile),
    isDesktop: computed(() => deviceInfo.value.isDesktop),
    deviceType: computed(() => deviceInfo.value.deviceType),
    screenSize: computed(() => deviceInfo.value.screenSize)
  };
}

/**
 * CSS媒体查询辅助函数
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export function isScreenSize(size: keyof typeof breakpoints): boolean {
  return window.innerWidth >= breakpoints[size];
}