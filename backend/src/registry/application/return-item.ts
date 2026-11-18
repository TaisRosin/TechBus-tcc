import type { LocationTransaction } from './location-ports';
import type { CatalogRecord, ReturnLocation } from '../domain/locations';

// Keep legacy references readable; only explicit company records enter the new catalog.
export async function returnItem(
  places: LocationTransaction,
  location: ReturnLocation,
): Promise<CatalogRecord | null> {
  if (location.groupId)
    return {
      id: location.id,
      name: location.name ?? location.label,
      address: location.address,
      stopReference: location.stopReference,
      groupId: location.groupId,
      active: location.active === true,
      version: location.version ?? 1,
    };
  return places.get('region', location.regionId);
}
