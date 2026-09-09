import { useEffect, useState } from 'react'

export default function AnalysisIndicator() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 350)
    const t2 = setTimeout(() => setStep(2), 700)
    const t3 = setTimeout(() => setStep(3), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const steps = [
    { label: 'Understanding request & intent', done: step > 0, active: step === 0 },
    { label: 'Querying ocean telemetry', done: step > 1, active: step === 1 },
    { label: 'Checking weather & marine risks', done: step > 2, active: step === 2 },
    { label: 'Running spatial analytics', done: step > 3, active: step === 3 },
    { label: 'Synthesizing recommendation', done: step > 3, active: step === 3 }
  ]

  return (
    <div className="chat-bubble-wrap orca-wrap analysis-step-wrap font-sans">
      <div className="orca-avatar-orb">
        <span>🐋</span>
      </div>

      <div className="analysis-progress-card">
        <div className="card-header">
          <span className="orca-title font-mono">ORCA ANALYSIS IN PROGRESS</span>
          <span className="live-spinner"></span>
        </div>

        <div className="steps-list font-sans">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className={`step-item ${st.done ? 'completed' : st.active ? 'in-progress' : 'pending'}`}
            >
              <span className="step-icon font-mono">
                {st.done ? '✓' : st.active ? '◉' : '◌'}
              </span>
              <span className="step-label">{st.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
