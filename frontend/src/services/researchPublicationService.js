/**
 * Service to fetch real peer-reviewed scientific publications from Crossref API
 * based on the Researcher's domain, interests, and study region.
 */
export const researchPublicationService = {
  fetchPublications: async ({ domain = '', interests = '', studyRegion = '' } = {}) => {
    const searchTerms = [domain, interests, studyRegion].filter(Boolean).join(' ').trim()
    const query = searchTerms || 'Oceanography'
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.crossref.org/works?query=${encodedQuery}&rows=6&sort=relevance`

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ORCA-MarineIntelligence/1.0 (mailto:admin@orca.gov)',
        },
      })

      if (!response.ok) {
        throw new Error(`Crossref API request failed (${response.status})`)
      }

      const data = await response.json()
      const items = data?.message?.items || []

      return items.map((item) => {
        const rawTitle = item.title && item.title.length > 0 ? item.title[0] : 'Untitled Publication'
        // Clean up HTML tags if present in title
        const cleanTitle = rawTitle.replace(/<[^>]*>/g, '')

        const journal =
          item['container-title'] && item['container-title'].length > 0
            ? item['container-title'][0].replace(/<[^>]*>/g, '')
            : item.publisher || 'Peer-Reviewed Journal'

        const doi = item.DOI
        const link = doi ? `https://doi.org/${doi}` : item.URL || '#'

        let year = 'Recent'
        const dateParts = item['published-print']?.['date-parts'] || item['published-online']?.['date-parts'] || item.created?.['date-parts']
        if (dateParts && dateParts[0] && dateParts[0][0]) {
          year = dateParts[0][0].toString()
        }

        let authors = 'Research Consortium'
        if (item.author && Array.isArray(item.author) && item.author.length > 0) {
          const names = item.author
            .slice(0, 3)
            .map((a) => `${a.given || ''} ${a.family || ''}`.trim())
            .filter(Boolean)
          if (names.length > 0) {
            authors = names.join(', ') + (item.author.length > 3 ? ' et al.' : '')
          }
        }

        return {
          id: doi || Math.random().toString(),
          title: cleanTitle,
          journal,
          year,
          authors,
          doi,
          link,
          domainTag: domain || 'Marine Research',
        }
      })
    } catch (err) {
      console.error('Failed to fetch Crossref publications:', err)
      throw err
    }
  },
}
