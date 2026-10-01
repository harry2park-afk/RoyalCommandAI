// Local-only component fixture, never a Next route or authentication bypass.
import React from 'react';
import {createRoot} from 'react-dom/client';
import LearningRoom from '../../src/app/rcv3/learn/LearningRoom';
import {PRACTICAL_COURSE} from '../../src/lib/rcv3/learning/practical-60';
const query=new URLSearchParams(location.search),legacy=query.has('legacy');
createRoot(document.getElementById('root')!).render(<LearningRoom language={query.get('language')??'en'} ownerId="fixture-owner" entryPath={legacy?'/rcv3/learn':'/rcv4/learn'} curriculumId={legacy?undefined:PRACTICAL_COURSE} initialLearning={{state:{completed:[],certificate:null},practice:[]}}/>);
