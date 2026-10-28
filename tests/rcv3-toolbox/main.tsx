// Isolated component harness. No Next route, auth bypass or real customer data.
import React from 'react';
import {createRoot} from 'react-dom/client';
import Room from '../../src/app/rcv3/Room';
createRoot(document.getElementById('root')!).render(<Room toolboxManager={new URLSearchParams(window.location.search).get("customer")!=="1"} language="en" providers={[{id:'openai',label:'ChatGPT',configured:true}]} secretaryRooms={[]}/>);
