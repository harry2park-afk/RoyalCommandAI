import {speechProgressRatio,type SpeechProgress} from '@/lib/client/speech-progress';
import styles from './ReadingProgress.module.css';
/** Non-interactive underline driven by the owning player's audio clock. */
export default function ReadingProgress({progress}:{progress:SpeechProgress|null}){
 const ratio=speechProgressRatio(progress);
 return <span className={styles.track} aria-hidden="true" data-reading-progress={ratio}><span className={styles.fill} style={{transform:`scaleX(${ratio})`}}/></span>;
}
