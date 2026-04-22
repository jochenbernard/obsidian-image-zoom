export const MODIFIER_KEYS = ["either", "cmd", "ctrl", "none"] as const;
export type ModifierKey = typeof MODIFIER_KEYS[number];

export interface PluginSettings {
  modifierKey: ModifierKey;
  minZoom: number;
  maxZoom: number;
  zoomSensitivity: number;
  resetOnDoubleClick: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  modifierKey: "either",
  minZoom: 0.1,
  maxZoom: 20,
  zoomSensitivity: 1,
  resetOnDoubleClick: true
};

export function isModifierKey(value: string): value is ModifierKey {
  return (MODIFIER_KEYS as readonly string[]).includes(value);
}
