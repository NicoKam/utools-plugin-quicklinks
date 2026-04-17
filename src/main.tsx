import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './main.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
} else {
  console.error('root不存在');
}
