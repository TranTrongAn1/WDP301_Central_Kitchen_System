import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Language = 'vi' | 'en';

interface UserSettingsState {
  language: Language;
  compactMode: boolean;
  enableEmailNotifications: boolean;
  enableSystemNotifications: boolean;
  enableSoundEffects: boolean;

  setLanguage: (language: Language) => void;
  toggleCompactMode: () => void;
  toggleEmailNotifications: () => void;
  toggleSystemNotifications: () => void;
  toggleSoundEffects: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      language: 'vi',
      compactMode: false,
      enableEmailNotifications: true,
      enableSystemNotifications: true,
      enableSoundEffects: false,

      setLanguage: (language) => set({ language }),
      toggleCompactMode: () =>
        set((state) => ({ compactMode: !state.compactMode })),
      toggleEmailNotifications: () =>
        set((state) => ({
          enableEmailNotifications: !state.enableEmailNotifications,
        })),
      toggleSystemNotifications: () =>
        set((state) => ({
          enableSystemNotifications: !state.enableSystemNotifications,
        })),
      toggleSoundEffects: () =>
        set((state) => ({ enableSoundEffects: !state.enableSoundEffects })),
    }),
    {
      name: 'user-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

