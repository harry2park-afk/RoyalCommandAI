import {afterEach,expect,it,vi} from 'vitest';
import {LearningConversation} from './learning-conversation';
afterEach(()=>vi.useRealTimers());
function setup(){let text:(s:string)=>void=()=>{},end:()=>void=()=>{};const cancel=vi.fn(),start=vi.fn(),ask=vi.fn(async(_text:string,_signal:AbortSignal)=> 'answer'),speak=vi.fn(async(_text:string,_signal:AbortSignal)=>{}),phase=vi.fn(),draft=vi.fn();const engine=new LearningConversation({listen:(t,e)=>{text=t;end=e;return {start,cancel};},ask,speak,phase,draft,stopAudio:vi.fn()});return {engine,ask,speak,phase,draft,start,cancel,text:(s:string)=>text(s),end:()=>end()};}
it('automatically asks once, speaks the answer and returns to listening',async()=>{vi.useFakeTimers();const x=setup();x.engine.start();x.text('question');await vi.advanceTimersByTimeAsync(3000);expect(x.ask).toHaveBeenCalledTimes(1);expect(x.ask.mock.calls[0][0]).toBe('question');expect(x.speak).toHaveBeenCalled();expect(x.start).toHaveBeenCalledTimes(2);x.engine.stop();});
it('resets silence while a student continues speaking and suppresses duplicate end events',async()=>{vi.useFakeTimers();const x=setup();x.engine.start();x.text('first');await vi.advanceTimersByTimeAsync(2000);x.text('first second');await vi.advanceTimersByTimeAsync(2000);expect(x.ask).not.toHaveBeenCalled();x.end();x.end();await vi.advanceTimersByTimeAsync(3000);expect(x.ask).toHaveBeenCalledTimes(1);x.engine.stop();});
it('cancels pending questions and does not speak after user stop',async()=>{vi.useFakeTimers();const x=setup();let resolve:(s:string)=>void=()=>{};x.ask.mockImplementation(()=>new Promise(r=>resolve=r));x.engine.start();x.text('question');await vi.advanceTimersByTimeAsync(3000);x.engine.stop();resolve('late');await Promise.resolve();expect(x.speak).not.toHaveBeenCalled();});
it('recognizes a spoken stop command without calling AI',async()=>{vi.useFakeTimers();const x=setup();x.engine.start();x.text('대화 종료');await vi.advanceTimersByTimeAsync(3000);expect(x.ask).not.toHaveBeenCalled();expect(x.phase).toHaveBeenLastCalledWith('idle');});
it('opens with teaching and then listens without waiting for a manual send',async()=>{const x=setup();x.engine.start('Introduce this lesson');await new Promise(r=>setTimeout(r,0));expect(x.ask).toHaveBeenCalledWith('Introduce this lesson',expect.any(AbortSignal));expect(x.speak).toHaveBeenCalled();expect(x.start).toHaveBeenCalledTimes(1);x.engine.stop();});
it('keeps listening after a spoken lesson command and routes the next question to that lesson',async()=>{
 const {learningVoiceCommand,voiceLessonIndex}=await import('./learning-voice-command');
 vi.useFakeTimers();const x=setup();let current=0;
 x.ask.mockImplementation(async text=>{const command=learningVoiceCommand(text);if(command){const next=voiceLessonIndex(command,current,60);if(next!==null)current=next;}return `lesson ${current+1}`;});
 x.engine.start();x.text('오늘 과목 3번 공부하자');await vi.advanceTimersByTimeAsync(3000);
 expect(x.speak.mock.calls.at(-1)?.[0]).toBe('lesson 3');
 x.text('다시 설명해 줘');await vi.advanceTimersByTimeAsync(3000);
 expect(x.ask).toHaveBeenCalledTimes(2);expect(x.speak.mock.calls.at(-1)?.[0]).toBe('lesson 3');expect(x.start).toHaveBeenCalledTimes(3);x.engine.stop();
});
it('touch pause aborts playback and resume replays the explanation without another AI request',async()=>{
 const x=setup();let finish:()=>void=()=>{};x.speak.mockImplementationOnce(()=>new Promise<void>(r=>finish=r));
 x.engine.start('teach');await Promise.resolve();expect(x.speak).toHaveBeenCalledTimes(1);
 const signal=x.speak.mock.calls[0][1];x.engine.pause();expect(signal.aborted).toBe(true);expect(x.phase).toHaveBeenLastCalledWith('paused');
 finish();await Promise.resolve();expect(x.phase).toHaveBeenLastCalledWith('paused');
 x.engine.resume();await Promise.resolve();expect(x.ask).toHaveBeenCalledTimes(1);expect(x.speak).toHaveBeenCalledTimes(2);x.engine.stop();
});
it('spoken wait and resume are local controls and never become AI questions',async()=>{
 vi.useFakeTimers();const x=setup();x.engine.start();x.text('잠깐 기다려');await vi.advanceTimersByTimeAsync(3000);expect(x.phase).toHaveBeenLastCalledWith('paused');
 x.text('시작해');await vi.advanceTimersByTimeAsync(3000);expect(x.phase).toHaveBeenLastCalledWith('listening');expect(x.ask).not.toHaveBeenCalled();x.engine.stop();
});
it('quiet listening restarts without sending a question and stop cancels that restart',async()=>{
 vi.useFakeTimers();const x=setup();x.engine.start();x.end();await vi.advanceTimersByTimeAsync(300);expect(x.start).toHaveBeenCalledTimes(2);expect(x.ask).not.toHaveBeenCalled();x.end();x.engine.stop();await vi.advanceTimersByTimeAsync(300);expect(x.start).toHaveBeenCalledTimes(2);
});
