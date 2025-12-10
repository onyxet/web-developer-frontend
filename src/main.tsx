import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import DAPPLayout from './components/DAPPLayout'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
	<DAPPLayout>
	  <App />
	</DAPPLayout>
  </StrictMode>,
)
