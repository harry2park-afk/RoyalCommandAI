import type { ConsultationRoomProfile } from "./types";

export const CONSULTATION_ROOM_PRESETS: ConsultationRoomProfile[] = [
  {
    id: "standard",
    name: "Standard Consultation Room",
    audience: "standard",
    presenceMode: "live-video",
    theme: "standard",
    largeText: false,
    simplifiedControls: false,
    reducedVisualLoad: false,
    friendlyLanguage: true,
    allowAvatar: true,
    allowLiveVideo: true,
    allowVoiceOnly: true,
    allowChat: true,
  },
  {
    id: "child",
    name: "Child-Friendly Consultation Room",
    audience: "child",
    presenceMode: "avatar",
    theme: "child-friendly",
    largeText: true,
    simplifiedControls: true,
    reducedVisualLoad: true,
    friendlyLanguage: true,
    allowAvatar: true,
    allowLiveVideo: true,
    allowVoiceOnly: true,
    allowChat: true,
    avatarStyle: "friendly and non-intimidating",
    backgroundStyle: "calm, simple and age-appropriate",
    notes: "Designed for a calm, simple and non-intimidating experience.",
  },
  {
    id: "senior",
    name: "Senior-Friendly Consultation Room",
    audience: "senior",
    presenceMode: "voice-only",
    theme: "senior-friendly",
    largeText: true,
    simplifiedControls: true,
    reducedVisualLoad: true,
    friendlyLanguage: true,
    allowAvatar: true,
    allowLiveVideo: true,
    allowVoiceOnly: true,
    allowChat: true,
    backgroundStyle: "quiet and low-complexity",
    notes: "Prioritises large text, simple controls and low visual complexity.",
  },
];

export function getConsultationRoomPreset(id: string) {
  return CONSULTATION_ROOM_PRESETS.find((preset) => preset.id === id) ?? CONSULTATION_ROOM_PRESETS[0];
}
