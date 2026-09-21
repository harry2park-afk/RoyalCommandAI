const messages = {
 intro: {en:'Choose how you will look to other participants. This is a local preview; no meeting is connected yet.',ko:'상대방에게 보일 모습을 선택하세요. 현재는 내 기기 미리보기이며, 실제 회의는 아직 연결되지 않았습니다.'},
 privacy: {en:'Camera preview stays on this device. Microphone and recording are off.',ko:'카메라 미리보기는 이 기기에서만 처리됩니다. 마이크와 녹화는 꺼져 있습니다.'},
 pose: {en:'Sit facing the camera at eye level. Centre your face above the desk.',ko:'카메라를 눈높이에 두고 정면으로 앉아 얼굴을 책상 위 중앙에 맞추세요.'},
 loading: {en:'Preparing camera and background…',ko:'카메라와 배경을 준비하고 있습니다…'},
 failed: {en:'Camera preview could not start. Check camera permission, close other camera apps, then retry.',ko:'카메라를 시작하지 못했습니다. 카메라 권한을 확인하고 다른 카메라 앱을 닫은 뒤 다시 시도하세요.'},
 unavailable: {en:'Background processing is unavailable. Your camera has been stopped. Please retry in desktop Chrome or Edge.',ko:'배경 처리를 사용할 수 없어 카메라를 껐습니다. PC Chrome 또는 Edge에서 다시 시도하세요.'},
 saved: {en:'Background selected for this browser.',ko:'이 브라우저에서 사용할 배경을 선택했습니다.'},
 staff: {en:'Any assistants pictured in the artwork are AI characters, not meeting participants.',ko:'그림에 표시된 비서는 AI 캐릭터이며 실제 회의 참석자가 아닙니다.'},
} as const;
export function meetingPreviewText(key:keyof typeof messages,locale:string){const m=messages[key];return locale.toLowerCase().split(/[-_]/)[0]==='ko'?`${m.en} ${m.ko}`:m.en;}
