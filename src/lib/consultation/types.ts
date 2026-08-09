export type ConsultationAudience = "standard" | "child" | "senior" | "custom";

export type ConsultationPresenceMode =
  | "live-video"
  | "avatar"
  | "voice-only"
  | "chat";

export type ConsultationRoomTheme =
  | "standard"
  | "calm"
  | "child-friendly"
  | "senior-friendly"
  | "minimal"
  | "custom";

export type ConsultationRoomProfile = {
  id: string;
  name: string;
  audience: ConsultationAudience;
  presenceMode: ConsultationPresenceMode;
  theme: ConsultationRoomTheme;
  largeText: boolean;
  simplifiedControls: boolean;
  reducedVisualLoad: boolean;
  friendlyLanguage: boolean;
  allowAvatar: boolean;
  allowLiveVideo: boolean;
  allowVoiceOnly: boolean;
  allowChat: boolean;
  avatarStyle?: string;
  backgroundStyle?: string;
  clinicianGreeting?: string;
  notes?: string;
};

export type ConsultationSessionPreferences = {
  roomProfileId: string;
  preferredPresenceMode: ConsultationPresenceMode;
  therapistCanCustomize: boolean;
  patientCanRequestChange: boolean;
};

export type PatientConsultationRoomSettings = {
  patientKey: string;
  roomProfileId: string;
  preferredPresenceMode: ConsultationPresenceMode;
  theme: ConsultationRoomTheme;
  largeText: boolean;
  simplifiedControls: boolean;
  reducedVisualLoad: boolean;
  avatarStyle?: string;
  backgroundStyle?: string;
  clinicianGreeting?: string;
  lastUpdatedBy: "clinician" | "patient" | "system";
  updatedAt: string;
};
