import { useState } from 'react'

export default function MapSearch({ locations, onSelectLocation }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const matches = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(query.toLowerCase()) ||
      loc.region.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (id) => {
    onSelectLocation(id)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="map-search-box">
      <div className="search-input-wrap">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search location (e.g. Visakhapatnam, Chennai)..."
          aria-label="Search monitoring location"
        />
        {query && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => { setQuery(''); setIsOpen(false) }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="search-dropdown">
          {matches.length > 0 ? (
            matches.map((item) => (
              <button
                key={item.id}
                type="button"
                className="search-item"
                onClick={() => handleSelect(item.id)}
              >
                📍 <strong>{item.name}</strong>
                <small>{item.region}</small>
              </button>
            ))
          ) : (
            <div className="no-matches">No locations found</div>
          )}
        </div>
      )}
    </div>
  )
}
