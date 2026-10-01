'use client';
import {Volume2} from 'lucide-react';
import {clampVolume} from '@/lib/client/audio-volume';
import styles from './VolumeControl.module.css';
/** Shared native range: 0 is mute, 1 is the original device playback level. */
export default function VolumeControl({value,onChange,label}:{value:number;onChange:(value:number)=>void;label:string}){
 return <div className={styles.control}>
  <input type="range" min="0" max="100" step="1" value={Math.round(clampVolume(value)*100)} aria-label={label} aria-orientation="vertical" aria-valuetext={`${Math.round(clampVolume(value)*100)}%`} onChange={event=>onChange(clampVolume(event.currentTarget.valueAsNumber/100))}/>
  <Volume2 size={18} aria-hidden="true"/>
 </div>;
}
