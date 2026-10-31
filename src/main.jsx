import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent mouse wheel from accidentally increasing/decreasing number inputs across the application
document.addEventListener(
  'wheel',
  (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
      e.target.blur();
    }
  },
  { passive: true }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
