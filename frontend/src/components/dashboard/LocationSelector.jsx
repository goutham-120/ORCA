import { useEffect, useRef, useState } from 'react'
import './LocationSelector.css'

export default function LocationSelector({ locations, selectedId, onSelect, coordinates }) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef(null)

  const activeItem = locations.find((item) => item.id === selectedId) || locations[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
    setFocusedIndex(locations.findIndex((item) => item.id === selectedId))
  }

  const handleSelect = (id) => {
    onSelect(id)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(locations.findIndex((item) => item.id === selectedId))
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev < locations.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : locations.length - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < locations.length) {
        handleSelect(locations[focusedIndex].id)
      }
    }
  }

  return (
    <div
      className={`orca-location-dropdown-wrapper ${isOpen ? 'is-open' : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="location-dropdown-trigger font-sans"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select monitoring location"
      >
        <div className="location-trigger-content">
          <span className="location-label font-mono">MONITORING LOCATION</span>
          <div className="location-selected-value">
            {/* <span className="location-pin-icon" aria-hidden="true"></span> */}
            <span className="location-name">{activeItem.name}</span>
          </div>
          <small className="location-coords font-mono">{coordinates || activeItem.coordinates}</small>
        </div>
        <div className="location-chevron-wrap" aria-hidden="true">
          <svg
            className={`location-chevron-svg ${isOpen ? 'is-rotated' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="location-dropdown-menu" role="listbox" aria-label="Locations">
          <div className="dropdown-menu-header font-mono">
            <span>AVAILABLE SECTORS ({locations.length})</span>
          </div>
          <div className="dropdown-menu-list">
            {locations.map((item, index) => {
              const isSelected = item.id === selectedId
              const isFocused = index === focusedIndex

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`location-option-item ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''}`}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="option-marker-wrap">
                    <span className="option-pin">📍</span>
                  </div>
                  <div className="option-details">
                    <div className="option-title-row">
                      <span className="option-name">{item.name}</span>
                      {isSelected && <span className="option-active-badge font-mono">ACTIVE</span>}
                    </div>
                    {item.region && <span className="option-region">{item.region}</span>}
                    <span className="option-coords font-mono">{item.coordinates}</span>
                  </div>
                  {isSelected && (
                    <div className="option-check-wrap" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
