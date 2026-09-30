const messages={
 outgoingVoice:{en:'Translated voice is unavailable. Retry; original audio will not be used instead.',ko:'번역 음성을 만들지 못했습니다. 다시 시도하세요. 원음으로 대신 보내지 않습니다.'},
 scope:{en:'Translate speech or text here in either direction. This does not yet receive or send live meeting audio.',ko:'여기서 음성 또는 글을 양방향으로 번역합니다. 실제 회의 음성의 자동 수신·송출은 아직 연결되지 않았습니다.'},
 privacy:{en:'When you translate, your speech or text is sent to OpenAI. Audio playback uses an AI voice. Use headphones. Each recording is limited to 20 seconds.',ko:'번역 시 음성 또는 글이 OpenAI로 전송됩니다. 번역 음성은 AI 음성입니다. 이어폰을 사용하세요. 한 번에 20초까지 녹음합니다.'},
 room:{en:'Select your RC room to use its translation access and usage allowance.',ko:'번역 이용 권한과 사용 한도를 적용할 내 RC 방을 선택하세요.'},
 error:{en:'Translation could not finish. Check your room access and AI connection, then retry.',ko:'번역을 완료하지 못했습니다. 방 이용 권한과 AI 연결을 확인한 뒤 다시 시도하세요.'},
 microphone:{en:'Microphone unavailable. Allow microphone access or type your sentence.',ko:'마이크를 사용할 수 없습니다. 마이크 권한을 허용하거나 문장을 입력하세요.'},
 loading:{en:'Translating…',ko:'번역 중…'},
 recording:{en:'Listening on this device…',ko:'이 기기의 마이크로 듣고 있습니다…'},
 noRooms:{en:'No RC rooms available. Open My Rooms to set up access.',ko:'사용할 RC 방이 없습니다. My Rooms에서 방을 준비하세요.'},
 voice:{en:'Voice unavailable; translated text is ready.',ko:'음성을 사용할 수 없지만 번역문은 준비되었습니다.'},
} as const;
export function meetingTranslationText(key:keyof typeof messages,locale:string){const m=messages[key];return locale.toLowerCase().split(/[-_]/)[0]==='ko'?`${m.en} ${m.ko}`:m.en;}
