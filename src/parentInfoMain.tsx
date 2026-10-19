import {initializeAnalytics,recordTrafficPage} from './lib/analytics';
import {createRoot} from 'react-dom/client';
import {ParentInformation, type ParentPage} from './components/ParentSupport';

// This entry intentionally does not load the game, IndexedDB, microphones or asset preloaders.
const path=location.pathname.split('/')[1];
const page:ParentPage=path==='privacy'||path==='feedback'?path:'terms';
initializeAnalytics();recordTrafficPage(page);
createRoot(document.getElementById('root')!).render(<ParentInformation page={page}/>);
