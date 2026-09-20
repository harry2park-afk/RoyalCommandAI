import type { RoomTemplate } from "@/lib/rooms/templates";

const f = (id: string, label: string, options: string[]) => ({ id, label, options });

/**
 * RCV3-only purpose extensions.
 * Shared/legacy RC catalogue remains untouched.
 */
export const RCV3_EXTRA_ROOM_PURPOSES: RoomTemplate[] = [
  {
    id: "artcraft",
    name: "Art / Craft Room",
    shortDescription: "Creative art, craft, making and hobby workspace",
    suggestedAgents: ["Creative Assistant", "Project Planner", "Materials Assistant"],
    fields: [f("activity", "Main activity", ["Art", "Craft", "DIY", "Design", "Mixed"])],
  },
  {
    id: "baby",
    name: "Baby / Nursery Room",
    shortDescription: "Baby care, nursery planning and family support",
    suggestedAgents: ["Family Assistant", "Schedule Assistant", "Shopping Assistant"],
    fields: [f("focus", "Main focus", ["Nursery", "Baby Care", "Routine", "Shopping", "Mixed"])],
  },
  {
    id: "boardgames",
    name: "Chess / Baduk / Board Games",
    shortDescription: "Chess, Go/Baduk and other board-game learning and play",
    suggestedAgents: ["Game Tutor", "Match Analyst", "Practice Coach"],
    fields: [f("game", "Game", ["Chess", "Go / Baduk", "Board Games", "Mixed"])],
  },
  {
    id: "cinema",
    name: "Cinema / Movie / Media Room",
    shortDescription: "Movies, film review, media planning and entertainment",
    suggestedAgents: ["Movie Assistant", "Media Research", "Recommendation Assistant"],
    fields: [f("use", "Main use", ["Movie Watching", "Film Study", "Media Planning", "Entertainment", "Mixed"])],
  },
  {
    id: "conference",
    name: "Conference / Video Conference / Webinar",
    shortDescription: "Meetings, video calls, webinars and presentations",
    suggestedAgents: ["Meeting Assistant", "Agenda Assistant", "Notes", "Follow-up"],
    fields: [f("format", "Main format", ["Conference", "Video Conference", "Webinar", "Presentation", "Mixed"])],
  },
  {
    id: "cooking",
    name: "Cooking / Food Room",
    shortDescription: "Cooking, recipes, meal planning and food projects",
    suggestedAgents: ["Recipe Assistant", "Meal Planner", "Shopping Assistant"],
    fields: [f("focus", "Main focus", ["Cooking", "Recipes", "Meal Planning", "Food Project", "Mixed"])],
  },
  {
    id: "game",
    name: "Game / Entertainment Room",
    shortDescription: "Gaming, entertainment, strategy and play",
    suggestedAgents: ["Game Assistant", "Strategy Coach", "Research Assistant"],
    fields: [f("type", "Game type", ["Video Games", "Strategy", "Family Games", "Entertainment", "Mixed"])],
  },
  {
    id: "library",
    name: "Library / Reading / Study Room",
    shortDescription: "Reading, research, study and personal learning",
    suggestedAgents: ["Reading Assistant", "Research Assistant", "Study Tutor"],
    fields: [f("focus", "Main focus", ["Reading", "Research", "Study", "Learning", "Mixed"])],
  },
  {
    id: "meditation",
    name: "Meditation / Wellness Room",
    shortDescription: "Meditation, relaxation and wellness routines",
    suggestedAgents: ["Wellness Assistant", "Routine Planner", "Learning Assistant"],
    fields: [f("focus", "Main focus", ["Meditation", "Relaxation", "Wellness", "Routine", "Mixed"])],
  },
  {
    id: "pet",
    name: "Pet / Animal Care Room",
    shortDescription: "Pets, animal care, schedules and records",
    suggestedAgents: ["Pet Care Assistant", "Schedule Assistant", "Records Assistant"],
    fields: [f("animal", "Animal", ["Dog", "Cat", "Bird", "Small Animal", "Other", "Mixed"])],
  },
  {
    id: "photography",
    name: "Photography / Studio Room",
    shortDescription: "Photography, studio work, image planning and projects",
    suggestedAgents: ["Photography Assistant", "Project Planner", "Media Assistant"],
    fields: [f("focus", "Main focus", ["Portrait", "Product", "Event", "Studio", "Editing", "Mixed"])],
  },
  {
    id: "podcast",
    name: "Podcast / Recording Studio",
    shortDescription: "Podcasting, recording, scripts and production planning",
    suggestedAgents: ["Recording Assistant", "Script Assistant", "Research Assistant"],
    fields: [f("format", "Main format", ["Podcast", "Voice Recording", "Interview", "Video Podcast", "Mixed"])],
  },
  {
    id: "robotics",
    name: "Robotics / Maker Room",
    shortDescription: "Robotics, maker projects, prototyping and technical learning",
    suggestedAgents: ["Maker Assistant", "Technical Research", "Project Planner"],
    fields: [f("focus", "Main focus", ["Robotics", "Electronics", "3D Printing", "Prototype", "Mixed"])],
  },
  {
    id: "stocktrading",
    name: "Stock / Trading / Investment Room",
    shortDescription: "Market research, watchlists and investment information workspace",
    suggestedAgents: ["Market Research", "News Monitor", "Portfolio Notes"],
    fields: [f("focus", "Main focus", ["Stocks", "ETFs", "Market Research", "Investment Notes", "Mixed"])],
  },
];
