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
it('prepares only authenticated owner progress and public practice without answer keys',async()=>{
 const page=await Page({searchParams:Promise.resolve({language:'ko',country:'AU'})});
 expect(m.state).toHaveBeenCalledWith('alice');expect(m.language).not.toHaveBeenCalled();
 expect(page.props.initialLearning.state.completed).toEqual(['001']);expect(page.props.initialLearning.practice).toHaveLength(100);
 expect(page.props.initialLearning.practice.every((q:Record<string,unknown>)=>!('answer' in q))).toBe(true);
 expect(page.props).toMatchObject({ownerId:'alice',language:'ko',country:'AU',entryPath:'/rcv4/learn'});
});
it('does not cache one account snapshot for another account',async()=>{
 m.state.mockImplementation(async(owner:string)=>({completed:owner==='alice'?['001']:['005'],certificate:null}));
 const alice=await Page({searchParams:Promise.resolve({})});m.session.mockResolvedValue({user:{id:'bob',countryCode:'US'},db:{}});
 const bob=await Page({searchParams:Promise.resolve({language:'en'})});
 expect(alice.props.initialLearning.state.completed).toEqual(['001']);expect(bob.props.initialLearning.state.completed).toEqual(['005']);expect(bob.props.ownerId).toBe('bob');
});
it('redirects unauthenticated entry before reading any progress',async()=>{
 m.session.mockRejectedValue(Error('RCV3_AUTH'));
 await expect(Page({searchParams:Promise.resolve({language:'hi',country:'IN'})})).rejects.toThrow('REDIRECT:/login?next=');expect(m.state).not.toHaveBeenCalled();
});
it('retains client retry after storage failure rather than manufacturing ready progress',async()=>{
 m.state.mockRejectedValue(Error('RCV3_STORAGE'));const page=await Page({searchParams:Promise.resolve({language:'ko'})});expect(page.props.initialLearning).toBeUndefined();
});
