import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

function MainLayout() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default MainLayout;
