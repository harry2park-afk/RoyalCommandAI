export type ExpandedConnectionCategory =
  | "media"
  | "music"
  | "sports"
  | "travel"
  | "marketplace";

export type ExpandedConnectionItem = {
  id: string;
  category: ExpandedConnectionCategory;
  subcategory: string;
  name: string;
  description: string;
  billing: "monthly" | "one_time" | "quote" | "included";
  priceAud?: number;
  priceLabel?: string;
  consultation?: boolean;
  exclusiveGroup?: string;
};

export const EXPANDED_CATALOG: ExpandedConnectionItem[] = [
  // Video / creator workflows. Keep provider-specific execution behind RC so the customer
  // can choose the outcome they want instead of having to understand individual AI vendors.
  { id: "media-ai-video", category: "media", subcategory: "video", name: "AI Video Studio", description: "Describe the video you want and let the Room prepare the script, scenes, voice, captions and final video through approved connected video providers.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "media-heygen", category: "media", subcategory: "video", name: "HeyGen Video Connection", description: "Connect HeyGen for supported avatar video, image animation, captions, speech, dubbing, translation and lip-sync workflows. Customer/provider plan requirements apply.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "media-avatar", category: "media", subcategory: "avatar", name: "AI Presenter / Avatar Video", description: "Create presenter-style videos from a script using an approved avatar and voice provider, with consent controls for private avatars and cloned voices.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "media-dubbing", category: "media", subcategory: "localisation", name: "Video Dubbing & Translation", description: "Translate and dub supported videos into other languages, with captions and lip-sync where the selected provider supports it.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "media-shorts", category: "media", subcategory: "social", name: "Shorts / Reels Production", description: "Prepare short-form vertical video from a topic or longer source: hook, script, captions, title and export package for social platforms.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "media-youtube-package", category: "media", subcategory: "youtube", name: "YouTube Publishing Package", description: "Prepare the finished video plus title, description, thumbnail brief, tags and upload checklist. Direct publishing is enabled only when an authorised YouTube connection is available.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "media-youtube-connect", category: "media", subcategory: "youtube", name: "YouTube Channel Connection", description: "Connect an authorised YouTube channel for supported publishing and channel workflows when the official API/OAuth connection is enabled for the country and account.", billing: "quote", priceLabel: "Connection/setup price to confirm" },

  // Music: separate learning/content licensing from generative music so future providers can
  // be swapped without changing the Room UX.
  { id: "music-sheet", category: "music", subcategory: "sheet-music", name: "Sheet Music Library Connection", description: "Connect approved sheet-music sources for lawful search, purchase, licensed download or library access. Copyright and supplier licence rules remain with the source service.", billing: "quote", priceLabel: "Supplier/connection price to confirm" },
  { id: "music-learning", category: "music", subcategory: "lessons", name: "Music Learning Room", description: "Organise lessons, teacher notes, practice plans, recordings, assignments and progress for an instrument or voice.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "music-practice", category: "music", subcategory: "practice", name: "Practice & Repertoire Tracker", description: "Track pieces, tempo, practice time, teacher feedback, recordings and performance goals in one Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "music-recording", category: "music", subcategory: "recording", name: "Recording Project Workspace", description: "Organise takes, lyrics, reference tracks, mixes, notes and deliverables for a recording project.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "music-ai-song", category: "music", subcategory: "creation", name: "AI Song / Music Creation", description: "Use an approved music-generation provider to create music from a brief such as genre, mood, lyrics and duration. Provider rights and commercial-use terms must be checked before release.", billing: "quote", priceLabel: "Provider/usage price to confirm" },
  { id: "music-release", category: "music", subcategory: "distribution", name: "Music Release Preparation", description: "Prepare master files, artwork brief, metadata and release checklist for supported distribution services. Direct distribution requires an authorised supplier connection.", billing: "monthly", priceLabel: "Price to confirm" },

  // Sports: the Room is sport-aware. More sports can be added as rows without changing Core.
  { id: "sports-general", category: "sports", subcategory: "general", name: "Sports Training Room", description: "General sports workspace for goals, training plans, videos, coaching notes, competition dates, bookings and progress records.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sports-golf", category: "sports", subcategory: "golf", name: "Golf Room", description: "Golf-focused workspace for lessons, swing videos, practice logs, handicap notes, club fitting records, tee-time requests and golf-trip files.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sports-football", category: "sports", subcategory: "football", name: "Football / Soccer Room", description: "Team or personal football workspace for training plans, match schedules, clips, coaching feedback, attendance and competition records.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sports-table-tennis", category: "sports", subcategory: "table-tennis", name: "Table Tennis Room", description: "Track drills, serves, match videos, coaching notes, ratings, tournaments and practice goals.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sports-badminton", category: "sports", subcategory: "badminton", name: "Badminton Room", description: "Track footwork, drills, match videos, coaching notes, tournament plans, partners and practice progress.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sports-video-analysis", category: "sports", subcategory: "analysis", name: "Sports Video Analysis", description: "Upload training or match video and connect approved analysis tools for clips, annotations and coaching review. Automated analysis capability depends on the selected sport/provider.", billing: "quote", priceLabel: "Provider/connection price to confirm" },
  { id: "sports-booking", category: "sports", subcategory: "booking", name: "Sports Venue / Lesson Booking", description: "Request lessons, courts, tee times or sports facilities through supported booking services, with customer approval before any paid booking is confirmed.", billing: "monthly", priceLabel: "Price to confirm" },

  // Travel and reservations: search/compare first, explicit approval before purchase.
  { id: "travel-assistant", category: "travel", subcategory: "assistant", name: "Travel & Booking Assistant", description: "Ask the Room to search and compare travel, dining, activities and tickets. The customer approves the final option and payment before a booking is committed.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "travel-flights", category: "travel", subcategory: "flights", name: "Flight Search / Booking Connection", description: "Compare supported flight options and travel-agency offers, including price and key conditions. Final booking depends on an authorised airline, agency or booking provider.", billing: "quote", priceLabel: "Connection/commission terms to confirm" },
  { id: "travel-rail", category: "travel", subcategory: "rail", name: "Rail / Coach Ticket Connection", description: "Search and prepare supported train or coach tickets, with customer approval before payment and confirmation.", billing: "quote", priceLabel: "Connection terms to confirm" },
  { id: "travel-hotels", category: "travel", subcategory: "hotel", name: "Hotel Booking Connection", description: "Compare supported accommodation options and prepare the selected booking after customer approval.", billing: "quote", priceLabel: "Connection/commission terms to confirm" },
  { id: "travel-restaurants", category: "travel", subcategory: "dining", name: "Restaurant Reservation", description: "Find and request restaurant reservations through supported reservation services; availability is confirmed by the provider.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "travel-tickets", category: "travel", subcategory: "tickets", name: "Events / Movies / Sports Tickets", description: "Search supported ticket sources for movies, concerts, shows and sporting events. The customer reviews the final price and seller before purchase.", billing: "quote", priceLabel: "Provider/booking terms to confirm" },
  { id: "travel-agency-market", category: "travel", subcategory: "agency-market", name: "RC Travel Agency Offers", description: "Allow approved travel-agency partners to respond to a customer travel brief or send matching special offers. Sponsored/partner offers must be clearly identified and compared fairly.", billing: "quote", priceLabel: "Partner/commission model" },

  // Marketplace is intentionally listing/connection only; RC is not the buyer, seller,
  // escrow provider or guarantor unless a future regulated product explicitly changes that.
  { id: "marketplace-listing", category: "marketplace", subcategory: "listing", name: "RC Community Marketplace", description: "Public listing and discovery area where members can advertise used goods and contact each other. RC provides the listing platform, not the underlying sale, payment, delivery or product guarantee.", billing: "included", priceLabel: "Marketplace access policy" },
  { id: "marketplace-seller-verify", category: "marketplace", subcategory: "safety", name: "Seller Verification", description: "Email/phone and risk-based identity checks for sellers, plus account history and enforcement controls. Verification is not an RC guarantee of the goods.", billing: "included", priceLabel: "Safety feature" },
  { id: "marketplace-emergency-report", category: "marketplace", subcategory: "safety", name: "Emergency Marketplace Report", description: "A prominent urgent-report route for suspected fraud or rapidly developing problems. Reports can trigger temporary Marketplace restrictions while the case is reviewed to reduce further harm.", billing: "included", priceLabel: "Safety feature" },
  { id: "marketplace-enforcement", category: "marketplace", subcategory: "safety", name: "Marketplace Enforcement", description: "Temporary restriction, listing removal, Marketplace suspension or account action for verified abuse, with records and review to limit repeated harm and false-report abuse.", billing: "included", priceLabel: "Safety feature" },
];
