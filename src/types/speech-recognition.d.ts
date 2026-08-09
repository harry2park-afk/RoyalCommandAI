export {};

declare global {
  interface SpeechRecognition {
    continuous: boolean;
  }

  interface Event {
    readonly error?: string;
  }
}
