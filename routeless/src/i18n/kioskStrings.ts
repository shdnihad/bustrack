export type KioskLang = 'en' | 'kn';

export interface KioskDictionary {
  title: string;
  subtitle: string;
  cacheBannerPrefix: string;
  cacheBannerNote: string;
  step1: string;
  step2: string;
  searchButton: string;
  clearButton: string;
  resultsHeading: string;
  directLabel: string;
  transferLabel: string;
  departs: string;
  arrives: string;
  duration: string;
  minutes: string;
  transfers: string;
  staleWarning: string;
  delayedLabel: string;
  availableLabel: string;
  noRouteHeading: string;
  lastUpdated: string;
  readOnlyNotice: string;
  switchLangLabel: string;
}

export const KIOSK_STRINGS: Record<KioskLang, KioskDictionary> = {
  en: {
    title: 'Public Village Bus Kiosk',
    subtitle: 'Touch-friendly journey lookup using locally saved timetables',
    cacheBannerPrefix: 'Local Cache Snapshot',
    cacheBannerNote:
      'Read-only kiosk mode. Uses saved device data only — does not receive live bus or crisis updates while offline.',
    step1: '1. Tap Your Boarding Stop',
    step2: '2. Tap Your School / College',
    searchButton: 'Find Safe Bus Routes',
    clearButton: 'Reset Selection',
    resultsHeading: 'Available Saved Journeys',
    directLabel: 'Direct Bus',
    transferLabel: 'Transfer Route',
    departs: 'Departs',
    arrives: 'Arrives',
    duration: 'Travel Time',
    minutes: 'min',
    transfers: 'Transfers',
    staleWarning: 'Stale record — verify locally at stop',
    delayedLabel: 'Delayed',
    availableLabel: 'Operational',
    noRouteHeading: 'No Safe Route Found in Saved Schedule',
    lastUpdated: 'Saved record age',
    readOnlyNotice: 'Driver personal details and license documents are hidden in public kiosk mode.',
    switchLangLabel: 'ಕನ್ನಡ',
  },
  kn: {
    title: 'ಸಾರ್ವಜನಿಕ ಗ್ರಾಮೀಣ ಬಸ್ ಕಿಯೋಸ್ಕ್',
    subtitle: 'ಸಾಧನದಲ್ಲಿ ಉಳಿಸಿದ ವೇಳಾಪಟ್ಟಿಯಿಂದ ಸುಲಭ ಪ್ರಯಾಣ ಹುಡುಕಾಟ',
    cacheBannerPrefix: 'ಸ್ಥಳೀಯ ಸಂಗ್ರಹ ಮಾಹಿತಿ',
    cacheBannerNote:
      'ಓದಲು ಮಾತ್ರ ಕಿಯೋಸ್ಕ್. ಉಳಿಸಿದ ಡೇಟಾವನ್ನು ಮಾತ್ರ ಬಳಸುತ್ತದೆ — ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿರುವಾಗ ಹೊಸ ಬಸ್ ಅಥವಾ ತುರ್ತು ಮಾಹಿತಿ ಬರುವುದಿಲ್ಲ.',
    step1: '೧. ನಿಮ್ಮ ಹತ್ತುವ ನಿಲ್ದಾಣವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    step2: '೨. ನಿಮ್ಮ ಶಾಲೆ ಅಥವಾ ಕಾಲೇಜನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    searchButton: 'ಸುರಕ್ಷಿತ ಬಸ್ ಮಾರ್ಗ ಹುಡುಕಿ',
    clearButton: 'ಮರುಹೊಂದಿಸಿ',
    resultsHeading: 'ಲಭ್ಯವಿರುವ ಉಳಿಸಿದ ಮಾರ್ಗಗಳು',
    directLabel: 'ನೇರ ಬಸ್',
    transferLabel: 'ಬದಲಾವಣೆ ಮಾರ್ಗ',
    departs: 'ಹೊರಡುವ ಸಮಯ',
    arrives: 'ತಲುಪುವ ಸಮಯ',
    duration: 'ಪ್ರಯಾಣದ ಅವಧಿ',
    minutes: 'ನಿಮಿಷ',
    transfers: 'ಬದಲಾವಣೆಗಳು',
    staleWarning: 'ಹಳೆಯ ಮಾಹಿತಿ — ನಿಲ್ದಾಣದಲ್ಲಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ',
    delayedLabel: 'ವಿಳಂಬವಾಗಿದೆ',
    availableLabel: 'ಕಾರ್ಯನಿರತ',
    noRouteHeading: 'ಉಳಿಸಿದ ವೇಳಾಪಟ್ಟಿಯಲ್ಲಿ ಸುರಕ್ಷಿತ ಮಾರ್ಗ ಲಭ್ಯವಿಲ್ಲ',
    lastUpdated: 'ಮಾಹಿತಿ ನವೀಕರಣ',
    readOnlyNotice: 'ಸಾರ್ವಜನಿಕ ಕಿಯೋಸ್ಕ್‌ನಲ್ಲಿ ಚಾಲಕರ ವೈಯಕ್ತಿಕ ಮತ್ತು ಪರವಾನಗಿ ವಿವರಗಳನ್ನು ತೋರಿಸಲಾಗುವುದಿಲ್ಲ.',
    switchLangLabel: 'English',
  },
};
