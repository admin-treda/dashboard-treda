import { create } from 'zustand'

interface ThemeState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
