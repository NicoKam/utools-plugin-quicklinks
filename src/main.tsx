import ReactDOM from 'react-dom/client'
import './main.css'
import App from './App.jsx'

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(<App />)
} else {
  console.error('root不存在')
}
