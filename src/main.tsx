import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './AdminApp.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

if (window.location.pathname.startsWith('/paineladmfc')) {
  root.render(
    <StrictMode>
      <AdminApp />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
