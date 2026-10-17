import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ChapterApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
