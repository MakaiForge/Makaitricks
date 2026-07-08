export interface ThemeBackground {
  type: 'none' | 'image' | 'gif' | 'video' | 'video-url' | 'image-url';
  file?: string;
  url?: string;
  position?: string;
  size?: string;
  overlayColor?: string;
  overlayBlur?: string;
}

export interface Theme {
  id: string;
  name: string;
  author?: string;
  authorName?: string;
  isActive: boolean;
  code: string;
  vars?: Record<string, string>;
  hasCustomSound?: boolean;
  originalSoundPath?: string;
  background?: ThemeBackground | null;
  sidebarBackground?: ThemeBackground | null;
  soundFileName?: string | null;
  format?: string;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MakaiThemeV3 {
  format: 'makaitheme';
  version: 3;
  id: string;
  name: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  variables: Record<string, string>;
  background: ThemeBackground | null;
  sidebarBackground?: ThemeBackground | null;
  hasSound: boolean;
  soundFileName: string | null;
}
