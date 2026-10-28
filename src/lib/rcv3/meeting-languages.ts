export const meetingLanguages = [
 ['ko','한국어'],['en','English'],['ja','日本語'],['zh','中文'],['es','Español'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['pt','Português'],['ar','العربية'],['hi','हिन्दी'],['vi','Tiếng Việt'],['th','ไทย'],['id','Bahasa Indonesia'],
] as const;
export const meetingLanguageCodes=meetingLanguages.map(([code])=>code);
