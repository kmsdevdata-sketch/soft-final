import { useEffect, useState } from 'react'
import ParticleField from './components/ParticleField'
import ParticlePrompt from './components/ParticlePrompt'
import MigrationSetup from './components/MigrationSetup'
import AnalysisStage, { type AnalysisUpdate } from './components/AnalysisStage'
import AIPlanningStage from './components/AIPlanningStage'

export default function App() {
  const [started, setStarted] = useState(false)
  const [sphereFormed, setSphereFormed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [textReady, setTextReady] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [analysisMode, setAnalysisMode] = useState(false)
  const [planningMode, setPlanningMode] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<AnalysisUpdate[]>([])

  useEffect(() => {
    if (!sphereFormed) return
    const timer = window.setTimeout(() => setShowPrompt(true), 300)
    return () => window.clearTimeout(timer)
  }, [sphereFormed])

  return <main className="experience" aria-label="인터랙티브 파티클 데모">
    <ParticleField morphToSphere={started} analysisMode={analysisMode}
      onStart={() => setStarted(true)} onSphereFormed={() => setSphereFormed(true)} />
    {showPrompt && !accepted && <section className="prompt-overlay" aria-label="클라우드 이전 확인">
      <ParticlePrompt onComplete={() => setTextReady(true)} />
      <div className="prompt-action">
        {textReady && <button type="button" className="prompt-yes"
          onClick={() => setAccepted(true)}>예</button>}
      </div>
    </section>}
    {accepted && !analysisMode && <MigrationSetup onNext={() => setAnalysisMode(true)} />}
    {analysisMode && !planningMode && <AnalysisStage onAdvance={results => {
      setAnalysisResults(results)
      setPlanningMode(true)
    }} />}
    {planningMode && <AIPlanningStage analysis={analysisResults} />}
  </main>
}
