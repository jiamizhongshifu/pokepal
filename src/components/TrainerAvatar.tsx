import { useState } from 'react';
import { Icon } from '../icons';
import { isAvatarPhoto } from '../lib/avatar';

export function TrainerAvatar({avatar='avatar-red',photo,size=48}:{avatar?:string;photo?:string;size?:number}) {
  const [failedPhoto,setFailedPhoto]=useState<string>();
  return isAvatarPhoto(photo) && failedPhoto !== photo
    ? <img className="trainer-photo" src={photo} width={size} height={size} alt="" draggable={false} onError={()=>setFailedPhoto(photo)}/>
    : <Icon name={avatar} size={size}/>;
}
