// Interim results replace the current utterance; they are never sent as orders.
export function createDictation(Recognition, {language, onText, onEnd, onError}) {
 if (!Recognition) throw new Error('Live dictation is unavailable in this browser. Try Chrome.');
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
  onError(event.error === 'not-allowed' ? 'Allow microphone access in your browser.' : event.error === 'audio-capture' ? 'No microphone found.' : event.error === 'no-speech' ? 'No speech detected. Your draft is preserved.' : 'Dictation disconnected. Your draft is preserved. Try again.');
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
