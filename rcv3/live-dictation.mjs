// Interim results replace the current utterance; they are never sent as orders.
export function createDictation(Recognition, {language, onText, onEnd, onError}) {
 if (!Recognition) throw new Error('이 브라우저는 실시간 받아쓰기를 지원하지 않습니다. Chrome에서 열어주세요.');
 const recognition = new Recognition();
 recognition.lang = language || 'ko-KR';
 recognition.continuous = true;
 recognition.interimResults = true;
 recognition.maxAlternatives = 1;
 let closed = false;
 recognition.onresult = event => {
  if (closed) return;
  const text = Array.from(event.results, result => (result[0]?.transcript || '').trim()).filter(Boolean).join(' ');
  onText(text);
 };
 recognition.onerror = event => {
  if (closed) return;
  closed = true;
  onError(event.error === 'not-allowed' ? '브라우저에서 마이크 사용을 허용해 주세요.' : event.error === 'audio-capture' ? '연결된 마이크를 찾을 수 없습니다.' : event.error === 'no-speech' ? '음성이 감지되지 않았습니다. 입력된 글은 유지됩니다.' : '실시간 받아쓰기 연결이 끊겼습니다. 입력된 글은 유지됩니다. 다시 눌러주세요.');
  recognition.abort();
 };
 recognition.onend = () => { if (!closed) {closed=true;onEnd();} };
 return {
  start(){recognition.start();},
  // Keep the visible draft, discard delayed events after stopping or editing.
  stop(){if(closed)return;closed=true;recognition.abort();onEnd();},
  cancel(){closed=true;recognition.abort();}
 };
}
