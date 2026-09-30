import labels from './learning-messages.json';
export const learningLanguages=['en','ko','ja','zh','hi'] as const;
export type LearningLanguage=typeof learningLanguages[number];
export function learningLanguage(value:string):LearningLanguage{const base=value.toLowerCase().split(/[-_]/)[0];return learningLanguages.includes(base as LearningLanguage)?base as LearningLanguage:'en';}
export type LearningLabel=keyof typeof labels;
export function learningLabel(key:LearningLabel,language:string){return labels[key][learningLanguage(language)];}
