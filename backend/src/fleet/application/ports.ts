import type { Window } from '../domain/fleet';
export interface Vehicle {
  id: string;
  identifier: string;
  plate: string;
  kind: 'van' | 'micro' | 'bus';
  seats: number;
  active: boolean;
  version: number;
  week: Window[][] | null;
}
export interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  version: number;
}
export interface FleetTransaction {
  exceptions(
    id: string,
    from: string,
    to: string,
  ): Promise<{ date: string; windows: Window[] }[]>;
  saveException(
    id: string,
    date: string,
    windows: Window[] | null,
  ): Promise<void>;
  vehicles(limit: number, offset: number): Promise<Vehicle[]>;
  drivers(limit: number, offset: number): Promise<Driver[]>;
  vehicle(id: string): Promise<Vehicle | null>;
  driver(id: string): Promise<Driver | null>;
  saveVehicle(value: Vehicle, insert: boolean): Promise<void>;
  saveDriver(value: Driver, insert: boolean): Promise<void>;
}
