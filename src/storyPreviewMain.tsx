import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// A separate dev entry: never loads the game store, analytics, or voice services.
if(import.meta.env.DEV){
 void import('./screens/StoryAdventurePreview').then(({StoryAdventurePreview})=>{
  createRoot(document.getElementById('root')!).render(<StrictMode><StoryAdventurePreview/></StrictMode>);
 });
}
