import { useState, useEffect, useRef } from 'react'
// FOR AWS JAM: add useFlags to the import
import { withLDProvider, useFlags } from 'launchdarkly-react-client-sdk'
import './App.css'

function App() {
  const [oldApiCount, setOldApiCount] = useState(0)
  const [newApiCount, setNewApiCount] = useState(0)
  const [oldApiErrors, setOldApiErrors] = useState(0)
  const [newApiErrors, setNewApiErrors] = useState(0)
  const [isTrafficRunning, setIsTrafficRunning] = useState(false)
  const trafficInterval = useRef<NodeJS.Timeout | null>(null)
  const {showApiResults} = useFlags()

  const generateRandomKey = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString()
  }

  const sendTrafficRequest = async () => {
    try {
      const key = generateRandomKey()
      // FOR AWS JAM: change the URL to the address of the server
      const response = await fetch(`http://${window.location.hostname}:3000/${key}`)
      
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
      {/* FOR AWS JAM: add this code block and flag to release API results panel */}
      {showApiResults && (
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
      )}
    </div>
  )
}

// FOR AWS JAM: get the client side ID from the LaunchDarkly project
// TODO: put client side ID in variable, include some logic to check for valid client side ID and only render error message if invalid, wait for ready signal from LD init?
export default withLDProvider({
  clientSideID: '68dad60a88b6ae09b138273a',
  context: {
    kind: "user",
    key: 'abc-123',
  }
})(App)
