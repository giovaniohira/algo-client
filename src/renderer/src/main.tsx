/// <reference types="../../preload/index.d.ts" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as monaco from 'monaco-editor'
import App from './App'
import './styles.css'
import { setupMonaco } from './lib/monaco-setup'

setupMonaco(monaco)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
