import type {
  CatalogKind,
  CatalogRecord,
  PlaceDefault,
  ReturnLocation,
} from '../domain/locations';
export abstract class AddressValidator {
  abstract validate(address: string): Promise<unknown>;
}
export interface LocationTransaction {
  lock(): Promise<void>;
  get(kind: CatalogKind, id: string): Promise<CatalogRecord | null>;
  list(
    kind: CatalogKind,
    limit: number,
    offset: number,
  ): Promise<CatalogRecord[]>;
  save(
    kind: CatalogKind,
    record: CatalogRecord,
    insert: boolean,
  ): Promise<void>;
  location(id: string): Promise<ReturnLocation | null>;
  byIdentity(provider: string, key: string): Promise<ReturnLocation | null>;
  insertLocation(location: ReturnLocation): Promise<void>;
  defaults(studentId: string): Promise<PlaceDefault[]>;
  saveDefault(value: PlaceDefault): Promise<void>;
}
