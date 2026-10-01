import React from 'react';
import {expect,it,vi} from 'vitest';
import VolumeControl from './VolumeControl';
import {clampVolume} from '@/lib/client/audio-volume';
it('exposes a vertical native 0–100 range and translates slider input into playback gain',()=>{
 vi.stubGlobal('React',React);const onChange=vi.fn();const tree=VolumeControl({value:.3,onChange,label:'음량'});
 const input=(tree.props.children as React.ReactElement[])[0] as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
 expect(input.props).toMatchObject({type:'range',min:'0',max:'100',value:30,'aria-orientation':'vertical','aria-label':'음량'});
 input.props.onChange!({currentTarget:{valueAsNumber:0}} as React.ChangeEvent<HTMLInputElement>);input.props.onChange!({currentTarget:{valueAsNumber:75}} as React.ChangeEvent<HTMLInputElement>);
 expect(onChange.mock.calls).toEqual([[0],[.75]]);expect([clampVolume(-1),clampVolume(2),clampVolume(NaN)]).toEqual([0,1,0]);vi.unstubAllGlobals();
});
