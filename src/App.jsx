import { useEffect, lazy, Suspense } from 'react';
import Home from './pages/Home';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';

const Studio = lazy(() => import('./pages/Studio'));

function App() {
  // Easter egg: Ctrl+Shift+K toggles unstyled view
  useEffect(() => {
    function handler(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        document.body.classList.toggle('no-css');
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (window.location.pathname === '/studio') {
    return (
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    );
  }

  return <Home />;
}

export default App;
