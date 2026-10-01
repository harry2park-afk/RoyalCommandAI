import {expect,it} from 'vitest';
import {pcmPlaybackProgress,speechProgressRatio} from './speech-progress';
it('measures played samples without counting initial delay or a network gap as speech',()=>{
 const blocks=[{start:10,duration:2},{start:15,duration:3}];
 expect(pcmPlaybackProgress(blocks,9,true)).toEqual({elapsed:0,duration:5});
 expect(pcmPlaybackProgress(blocks,13,true)).toEqual({elapsed:2,duration:5});
 expect(pcmPlaybackProgress(blocks,16,true)).toEqual({elapsed:3,duration:5});
 expect(pcmPlaybackProgress(blocks,20,true)).toEqual({elapsed:5,duration:5});
 expect(pcmPlaybackProgress(blocks,16,false)).toEqual({elapsed:3,duration:null});
});
it('does not fabricate progress from unknown duration or invalid clocks',()=>{
 expect([speechProgressRatio(null),speechProgressRatio({elapsed:8,duration:null}),speechProgressRatio({elapsed:Infinity,duration:10}),speechProgressRatio({elapsed:2,duration:Infinity})]).toEqual([0,0,0,0]);
 expect(speechProgressRatio({elapsed:3,duration:5})).toBe(.6);
 expect(speechProgressRatio({elapsed:6,duration:5})).toBe(1);
});
