import {roomTemplates,templateImage} from './templates';
// Publish usable artwork only. Existing room assets remain stored with their rooms.
export const roomCatalog = roomTemplates;
export const roomCategories = [...new Set(roomTemplates.map(t=>t.category))];
export {templateImage};
