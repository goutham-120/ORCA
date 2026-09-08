import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const categories = [
  { value: 'fisher_marine_operator', name: 'Fishers & Marine Operators', description: 'Safer fishing, PFZs, route guidance' },
  { value: 'researcher_scientist', name: 'Researchers & Scientists', description: 'Data analysis, trend study' },
  { value: 'coastal_authority', name: 'Coastal Authorities', description: 'Monitoring, risk assessment, policy support' },
  { value: 'general_user', name: 'General Users', description: 'Explore conditions, view alerts, ask questions' },
]

export default function Personalization({ navigate }) {
  const { updateProfile } = useAuth()
  const [selection, setSelection] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!selection) return
    setBusy(true)
    setError('')
    try {
      await updateProfile({ user_category: selection })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to save your selection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" style={{ maxWidth: 720, margin: '48px auto', padding: 28 }} aria-labelledby="personalization-title">
      <p className="eyebrow">PERSONALIZATION</p>
      <h1 id="personalization-title" style={{ marginTop: 0 }}>What best describes you?</h1>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gap: 12 }}>
          {categories.map((category) => (
            <label key={category.value} style={{ display: 'block', padding: 16, border: `1px solid ${selection === category.value ? 'var(--blue)' : 'var(--line)'}`, borderRadius: 8, cursor: 'pointer', background: selection === category.value ? '#eef8fe' : '#fff' }}>
              <input type="radio" name="user-category" value={category.value} checked={selection === category.value} onChange={() => setSelection(category.value)} />
              <strong style={{ marginLeft: 10 }}>{category.name}</strong>
              <span style={{ display: 'block', margin: '7px 0 0 25px', color: 'var(--muted)', fontSize: 13 }}>{category.description}</span>
            </label>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={!selection || busy}>{busy ? 'Saving…' : 'Save & Continue'}</button>
      </form>
    </section>
  )
}
