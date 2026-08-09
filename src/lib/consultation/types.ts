export type ConsultationAudience = "standard" | "child" | "senior" | "custom";

export type ConsultationPresenceMode =
  | "live-video"
  | "avatar"
  | "voice-only"
  | "chat";

export type ConsultationRoomProfile = {
  id: string;
  name: string;
  audience: ConsultationAudience;
  presenceMode: ConsultationPresenceMode;
  largeText: boolean;
  simplifiedControls: boolean;
  reducedVisualLoad: boolean;
  friendlyLanguage: boolean;
  allowAvatar: boolean;
  allowLiveVideo: boolean;
  allowVoiceOnly: boolean;
  allowChat: boolean;
  notes?: string;
};

export type ConsultationSessionPreferences = {
  roomProfileId: string;
  preferredPresenceMode: ConsultationPresenceMode;
  therapistCanCustomize: boolean;
  patientCanRequestChange: boolean;
};
