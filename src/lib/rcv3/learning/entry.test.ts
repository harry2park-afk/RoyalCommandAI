import {expect,it} from 'vitest';
import {learningSignupReturn} from './entry';
it('preserves only the existing education destination through signup',()=>{expect(learningSignupReturn('?next='+encodeURIComponent('/rcv3/learn?language=ko&country=AU'))).toBe('/rcv3/learn?language=ko&country=AU');for(const next of ['//evil.test/rcv3/learn','https://evil.test/rcv3/learn','/dashboard','/rcv3/learn-evil'])expect(learningSignupReturn('?next='+encodeURIComponent(next))).toBe('/dashboard');expect(learningSignupReturn('')).toBe('/dashboard');});
