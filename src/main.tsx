import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 添加错误处理
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = '<div style="color:red;padding:20px;">Error: ' + (error as Error).message + '</div>';
}