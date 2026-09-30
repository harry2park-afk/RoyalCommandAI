import {expect,it} from 'vitest';
import {learningVoiceCommand as parse,voiceLessonIndex} from './learning-voice-command';
it('recognizes explicit spoken lessons in the supported languages',()=>{for(const s of ['오늘 과목 3번 공부하자','3번 수업 시작해 줘','삼 번 공부하자','start lesson 3','3課を始めて','3课开始','पाठ 3 शुरू करो'])expect(parse(s)).toEqual({kind:'lesson',number:3});});
it('keeps questions about lesson numbers as questions',()=>{for(const s of ['3번 수업이 왜 중요해?','3개의 예시를 알려줘','what is lesson 3 about?','다시 설명해 줘'])expect(parse(s)).toBeNull();});
it('handles read repeat and next, rejecting unavailable lessons',()=>{expect(parse('그냥 읽어줘')).toEqual({kind:'read'});expect(parse('다시 들려줘')).toEqual({kind:'repeat'});expect(parse('다음 수업')).toEqual({kind:'next'});expect(voiceLessonIndex({kind:'lesson',number:3},0,60)).toBe(2);expect(voiceLessonIndex({kind:'lesson',number:0},0,60)).toBeNull();expect(voiceLessonIndex({kind:'next'},59,60)).toBeNull();});

it('every localized numbered start selects the same lesson',async()=>{
 const {learningLabel}=await import('@/lib/locale/learning');
 for(const language of ['en','ko','ja','zh','hi'])for(let number=1;number<=60;number++){
  expect(parse(learningLabel('lessonStartRequest',language).replace('{number}',String(number)))).toEqual({kind:'lesson',number});
 }
});
