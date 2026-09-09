# Real-provider configuration

`Open-Meteo` weather, marine forecasts, SST, waves, and current forecasts operate
without a credential.  The PFZ and ocean-colour providers never synthesize output.

- `ORCA_PFZ_GEOJSON_URL`: HTTPS URL for an authorised official PFZ GeoJSON
  FeatureCollection (for example, an INCOIS-approved feed). INCOIS's public PFZ
  WebGIS is the source reference but does not publish a stable, documented GeoJSON
  endpoint for anonymous service-to-service use.
- `ORCA_CHLOROPHYLL_GEOJSON_URL`: HTTPS URL for an authorised Copernicus, NOAA,
  NASA, INCOIS, or equivalent ocean-colour GeoJSON FeatureCollection.
- `ORCA_CHLOROPHYLL_TOKEN`: optional bearer token passed only to the configured
  chlorophyll endpoint.

The storm provider uses NOAA NCEI's public IBTrACS v04r01 `last3years` CSV and
does not require credentials. Cached provider values retain their original source
and fetch timestamp and are marked `cached` or `stale` when live retrieval fails.
