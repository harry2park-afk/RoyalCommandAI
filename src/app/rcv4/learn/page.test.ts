import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({session:vi.fn(),state:vi.fn(),language:vi.fn()}));
vi.mock('@/lib/rcv3/access',()=>({session:m.session}));
vi.mock('@/lib/rcv3/learning/store',()=>({learningState:m.state}));
vi.mock('@/lib/rcv3/answer-language',()=>({accountAnswerLanguage:m.language}));
vi.mock('@/app/rcv3/learn/LearningRoom',()=>({default:()=>null}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`);}}));
import Page from './page';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('React',React);m.session.mockResolvedValue({user:{id:'alice',countryCode:'AU'},db:{}});m.state.mockResolvedValue({completed:['001'],certificate:null,work:{}});m.language.mockResolvedValue('ko');});
it('opens the authenticated practical test without importing old assessment records',async()=>{
 const page=await Page({searchParams:Promise.resolve({language:'ko',country:'AU'})});
 expect(m.state).not.toHaveBeenCalled();expect(m.language).not.toHaveBeenCalled();
 expect(page.props.initialLearning).toEqual({state:{completed:[],certificate:null},practice:[]});
 expect(page.props).toMatchObject({ownerId:'alice',language:'ko',country:'AU',entryPath:'/rcv4/learn',curriculumId:'ai-tools-60-preview-v1'});
});
it('scopes the mounted course to the authenticated account and selected language',async()=>{
 const alice=await Page({searchParams:Promise.resolve({})});m.session.mockResolvedValue({user:{id:'bob',countryCode:'US'},db:{}});
 const bob=await Page({searchParams:Promise.resolve({language:'en'})});
 expect(alice.props.ownerId).toBe('alice');expect(alice.props.language).toBe('ko');expect(bob.props.ownerId).toBe('bob');expect(bob.props.language).toBe('en');expect(alice.key).not.toBe(bob.key);
 expect(m.state).not.toHaveBeenCalled();
});
it('preserves the existing unauthenticated login destination',async()=>{
 m.session.mockRejectedValue(Error('RCV3_AUTH'));
 await expect(Page({searchParams:Promise.resolve({language:'hi',country:'IN'})})).rejects.toThrow('REDIRECT:/login?next=');expect(m.state).not.toHaveBeenCalled();
});
