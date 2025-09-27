import { useState, useEffect, useRef } from 'react'
import { withLDProvider } from 'launchdarkly-react-client-sdk'
import Observability from '@launchdarkly/observability'
import SessionReplay from '@launchdarkly/session-replay'
import './App.css'

function App() {
  const [oldApiCount, setOldApiCount] = useState(0)
  const [newApiCount, setNewApiCount] = useState(0)
  const [oldApiErrors, setOldApiErrors] = useState(0)
  const [newApiErrors, setNewApiErrors] = useState(0)
  const [isTrafficRunning, setIsTrafficRunning] = useState(false)
  const trafficInterval = useRef<NodeJS.Timeout | null>(null)

  const generateRandomKey = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString()
  }

  const sendTrafficRequest = async () => {
    try {
      const key = generateRandomKey()
      const response = await fetch(`https://quz5whe2k35grqot6rr4nt3kcu0lqkch.lambda-url.us-east-2.on.aws/?key=${key}`)

      if (!response.ok) {
        const text = await response.text()
        if (text.includes('OLD API ERROR')) {
          setOldApiErrors(prev => prev + 1)
          setOldApiCount(prev => prev + 1)
        } else if (text.includes('NEW API ERROR')) {
          setNewApiErrors(prev => prev + 1)
          setNewApiCount(prev => prev + 1)
        }
      }
      else {
        const data = await response.json()
          if (data.msg === 'OLD') {
          setOldApiCount(prev => prev + 1)
        } else if (data.msg === 'NEW') {
          setNewApiCount(prev => prev + 1)
        }
      }
    } catch (error: any) {
      console.log(`Error generating traffic: ${error}`)
    }
  }

  const handleStartTraffic = () => {
    if (isTrafficRunning) {
      // Stop traffic
      if (trafficInterval.current) {
        clearInterval(trafficInterval.current)
        trafficInterval.current = null
      }
      setIsTrafficRunning(false)
    } else {
      // Start traffic
      trafficInterval.current = setInterval(sendTrafficRequest, 25)
      setIsTrafficRunning(true)
    }
  }

  const handleReset = () => {
    setOldApiCount(0)
    setNewApiCount(0)
    setOldApiErrors(0)
    setNewApiErrors(0)
  }

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (trafficInterval.current) {
        clearInterval(trafficInterval.current)
      }
    }
  }, [])

  return (
    <div className="app-container">
      <div className="left-section">
        <div className="control-panel">
          <h2>Control Panel</h2>
          <div className="button-container">
            <button onClick={handleStartTraffic}>
              {isTrafficRunning ? 'Stop Traffic' : 'Start Traffic'}
            </button>
            <button onClick={handleReset}>Reset</button>
          </div>
        </div>
      </div>
      <div className="right-section">
        <div className="results">
          <h2>Results</h2>
          <div className="counter-container">
            <div className="counter">
              <h3>Old API Hits</h3>
              <p>{oldApiCount}</p>
            </div>
            <div className="counter">
              <h3>New API Hits</h3>
              <p>{newApiCount}</p>
            </div>
            <div className="counter error-counter">
              <h3>Old API Errors</h3>
              <p>{oldApiErrors}</p>
            </div>
            <div className="counter error-counter">
              <h3>New API Errors</h3>
              <p>{newApiErrors}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withLDProvider({
  clientSideID: '6622f4d207a0a80fed54a557',
  context: {
    kind: "user",
    key: 'abc-123',
  },
  options: {
    plugins: [
      new Observability({
        networkRecording: {
          enabled: true,
          recordHeadersAndBody: true
        }
      }),
      new SessionReplay({
        serviceName: 'guarded-rollout-demo-UI',
        // Obfuscation - see https://launchdarkly.com/docs/sdk/features/client-side-observability#privacy for more details
        privacySetting: 'strict'
      })
    ]
  }
})(App)
