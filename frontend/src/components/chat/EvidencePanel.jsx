import { useState } from 'react'

function cleanOrganization(rawSource, docTitle) {
  if (!rawSource) return 'Official Marine Authority'
  let s = String(rawSource).trim()

  const combined = `${s} ${docTitle || ''}`.toLowerCase()
  if (combined.includes('fisheries') || combined.includes('mofahd') || combined.includes('fishing ban')) {
    return 'Department of Fisheries, GoI'
  }
  if (combined.includes('coast guard') || combined.includes('safe waters') || combined.includes('nmsar')) {
    return 'Indian Coast Guard'
  }
  if (combined.includes('cmfri') || combined.includes('mackerel') || combined.includes('sardine')) {
    return 'CMFRI — ICAR'
  }
  if (combined.includes('incois') || combined.includes('potential fishing zone') || combined.includes('pfz')) {
    return 'INCOIS'
  }
  if (combined.includes('mpeda') || combined.includes('export')) {
    return 'MPEDA'
  }

  // If it's a file path, extract the meaningful top name
  if (s.includes('/') || s.includes('\\') || s.endsWith('.pdf') || s.endsWith('.txt')) {
    const parts = s.split(/[/\\]/).filter(Boolean)
    if (parts.length > 0) {
      const first = parts[0].replace(/[._-]/g, ' ')
      return first.toUpperCase() === 'CMFRI' ? 'CMFRI — ICAR' : first
    }
  }

  return s
}

function cleanDocumentTitle(rawTitle) {
  if (!rawTitle) return 'Marine Guidance Document'
  let s = String(rawTitle).trim()
  if (s.includes('/') || s.includes('\\')) {
    s = s.split(/[/\\]/).filter(Boolean).pop() || s
  }
  s = s.replace(/\.(pdf|txt|cdr|csv|json)$/i, '')
  s = s.replace(/_clean$/i, '')
  s = s.replace(/_/g, ' ')
  return s
}

function KnowledgeSourceCard({ item }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="evidence-item-card knowledge-source-card"
      style={{
        borderColor: '#bfdbfe',
        background: '#f8fafc',
        padding: '14px',
        borderRadius: '8px',
        overflow: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="item-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          minWidth: 0,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <span
          className="source-name font-sans"
          style={{
            color: '#1e3a8a',
            fontWeight: 700,
            fontSize: '12.5px',
            minWidth: 0,
            flex: '1 1 auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.organization}
        >
          {item.organization}
        </span>
        <span
          className="evidence-badge font-mono knowledge"
          style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 800,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          OFFICIAL KNOWLEDGE
        </span>
      </div>

      <p
        className="item-summary font-sans"
        style={{
          fontWeight: 600,
          color: '#0f172a',
          margin: '4px 0 6px 0',
          fontSize: '13px',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          minWidth: 0,
          maxWidth: '100%',
          lineHeight: 1.45,
        }}
      >
        {item.documentTitle}
      </p>

      {item.year && (
        <div className="font-mono" style={{ fontSize: '11px', color: '#475569', marginBottom: '6px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Year: <strong style={{ color: '#1e293b' }}>{item.year}</strong>
        </div>
      )}

      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', minWidth: 0 }}>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="font-mono"
          style={{
            background: 'none',
            border: 'none',
            padding: '2px 0',
            color: '#2563eb',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Toggle provenance details"
        >
          {expanded ? '▲ Hide source details' : '▼ [View source details]'}
        </button>

        {expanded && (
          <div
            className="source-details-panel font-sans"
            style={{
              marginTop: '8px',
              padding: '10px',
              background: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              color: '#334155',
              lineHeight: 1.5,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              minWidth: 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Issuing Authority: </span>
              <strong style={{ color: '#0f172a' }}>{item.organization}</strong>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Statutory Document: </span>
              <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.documentTitle}</span>
            </div>
            {item.year && (
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Publication Year: </span>
                <span className="font-mono" style={{ color: '#0f172a' }}>{item.year}</span>
              </div>
            )}
            {item.pageRef && (
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Page Reference: </span>
                <span className="font-mono" style={{ color: '#0f172a' }}>{item.pageRef}</span>
              </div>
            )}
            {item.domain && (
              <div>
                <span style={{ color: '#64748b' }}>Classification: </span>
                <span style={{ textTransform: 'capitalize', color: '#0f172a' }}>{item.domain.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function parseKnowledgeItems(rag) {
  if (!rag) return []

  const chunks = rag.retrieved_chunks || []
  if (chunks.length > 0) {
    const docMap = new Map()

    for (const chunk of chunks) {
      const docTitle = cleanDocumentTitle(chunk.document || chunk.source || 'Official Marine Record')
      const docKey = docTitle
      if (!docMap.has(docKey)) {
        const year = chunk.year || (docTitle.match(/\b(20\d\d)\b/) ? docTitle.match(/\b(20\d\d)\b/)[1] : null)
        const org = cleanOrganization(chunk.source, docTitle)
        docMap.set(docKey, {
          organization: org,
          documentTitle: docTitle,
          year: year,
          pages: new Set(),
          domain: chunk.domain || 'marine_knowledge',
        })
      }
      const entry = docMap.get(docKey)
      if (chunk.page_number && strIsPage(chunk.page_number)) {
        entry.pages.add(chunk.page_number)
      }
    }

    return Array.from(docMap.values()).map((entry) => {
      const pageList = Array.from(entry.pages).sort((a, b) => Number(a) - Number(b))
      const pageRef = pageList.length > 0 ? `Page ${pageList.join(', ')}` : null
      return {
        organization: entry.organization,
        documentTitle: entry.documentTitle,
        year: entry.year,
        pageRef: pageRef,
        domain: entry.domain,
      }
    })
  }

  // Fallback to parsing sources array
  const sources = rag.sources || []
  return sources.map((sourceText) => {
    const parts = sourceText.split(' — ')
    let rawOrg = parts.length > 1 ? parts[0].trim() : 'Official Marine Knowledge'
    let doc = parts.length > 1 ? parts.slice(1).join(' — ').trim() : sourceText.trim()
    let year = null
    const yearMatch = doc.match(/\b(20\d\d)\b/)
    if (yearMatch) {
      year = yearMatch[1]
    }
    doc = doc.replace(/\s*\(\d{4}\)/g, '').replace(/,\s*p\.\s*\d+/g, '').trim()
    doc = cleanDocumentTitle(doc)
    const org = cleanOrganization(rawOrg, doc)

    return {
      organization: org,
      documentTitle: doc,
      year: year,
      pageRef: null,
      domain: 'official_knowledge',
    }
  })
}

function strIsPage(val) {
  if (val == null) return false
  const s = String(val).trim()
  return s !== '' && s !== '-1' && s.toLowerCase() !== 'none'
}

export default function EvidencePanel({ evidence = [], rag = null }) {
  const hasLive = Boolean(evidence && evidence.length > 0)
  const knowledgeItems = parseKnowledgeItems(rag)
  const hasRag = Boolean(rag?.used && knowledgeItems.length > 0)

  if (!hasLive && !hasRag) return null

  const totalCount = (evidence?.length || 0) + knowledgeItems.length

  return (
    <div className="evidence-panel-wrapper font-sans" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <details className="evidence-details" open style={{ minWidth: 0, maxWidth: '100%' }}>
        <summary className="evidence-summary font-mono">
          <span>Sources & Provenance ({totalCount})</span>
          <span className="summary-chevron">▼</span>
        </summary>

        {hasLive && (
          <div className="evidence-section" style={{ minWidth: 0 }}>
            <div className="evidence-section-header font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', margin: '8px 0 6px', letterSpacing: '0.04em' }}>
              📡 LIVE SENSOR & SATELLITE TELEMETRY
            </div>
            <div className="evidence-grid" style={{ minWidth: 0 }}>
              {evidence.map((item, index) => {
                const status = item.metadata?.data_status || item.metadata?.source_status || 'unavailable'
                const badgeClass = status === 'live' ? 'live' : status === 'cached' ? 'cached' : 'unavailable'
                const observedDate = item.observed_at ? new Date(item.observed_at).toLocaleString() : null

                return (
                  <div
                    key={`${item.source}-${index}`}
                    className="evidence-item-card"
                    style={{
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid #bae6fd',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.04)',
                    }}
                  >
                    <div>
                      <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <span
                          className="source-name font-sans"
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.source}
                        </span>
                        <span className={`evidence-badge font-mono ${badgeClass}`} style={{ flexShrink: 0 }}>
                          {status.toUpperCase()}
                        </span>
                      </div>

                      {item.satellite_mission && (
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', margin: '4px 0 8px 0' }}>
                          <span
                            style={{
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 700,
                              lineHeight: 1.3,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🛰️</span> {item.satellite_mission}
                          </span>
                          {item.metadata?.satellite_payload && (
                            <span
                              style={{
                                color: '#475569',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 600,
                              }}
                            >
                              {item.metadata.satellite_payload}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="item-summary font-sans" style={{ color: '#334155', fontSize: '12px', lineHeight: 1.45, margin: '0 0 10px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {item.summary}
                      </p>
                    </div>

                    <div
                      className="item-footer font-mono"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        paddingTop: '8px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: '10.5px',
                        color: '#64748b',
                      }}
                    >
                      {observedDate ? (
                        <span className="timestamp" style={{ fontSize: '10.5px' }}>
                          Observed: {observedDate}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Real-time Feed</span>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="source-link"
                          style={{
                            marginLeft: 'auto',
                            color: '#0284c7',
                            fontWeight: 700,
                            fontSize: '11px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          Source API ↗
                        </a>
                      )}
                    </div>

                    {item.metadata?.error && (
                      <div className="evidence-error-text font-sans" style={{ marginTop: '6px', fontSize: '11px', color: '#b91c1c', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        ⚠️ {item.metadata.error}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {hasRag && (
          <div className="evidence-section" style={{ marginTop: hasLive ? '14px' : '8px', minWidth: 0 }}>
            <div className="evidence-section-header font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', margin: '8px 0 6px', letterSpacing: '0.04em' }}>
              📚 OFFICIAL MARINE KNOWLEDGE
            </div>
            <div
              className="evidence-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '10px',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {knowledgeItems.map((item, idx) => (
                <KnowledgeSourceCard key={`rag-${idx}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </details>
    </div>
  )
}
