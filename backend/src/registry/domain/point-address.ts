import { exact, invalid } from './registry';

// Company-supplied data only. This structure is not geographic validation.
export interface PointAddress {
  street: string;
  number: string;
  noNumber: boolean;
  neighborhood: string;
  city: string;
  state: string;
  country: 'BR';
  postalCode: string;
  complement: string;
}
const states = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(
    ' ',
  ),
);
function text(value: unknown, max: number, required = false): string {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    return invalid();
  return value.trim();
}
export function parsePointAddress(input: unknown): PointAddress {
  const v = exact(input, [
    'street',
    'number',
    'noNumber',
    'neighborhood',
    'city',
    'state',
    'country',
    'postalCode',
    'complement',
  ]);
  const street = text(v.street, 200, true),
    number = text(v.number, 20),
    neighborhood = text(v.neighborhood, 120),
    city = text(v.city, 120, true),
    state = text(v.state, 2, true).toUpperCase(),
    country = text(v.country, 2, true).toUpperCase(),
    postalCode = text(v.postalCode, 9),
    complement = text(v.complement, 200);
  if (
    typeof v.noNumber !== 'boolean' ||
    (v.noNumber ? number !== '' : number === '') ||
    !states.has(state) ||
    country !== 'BR' ||
    (postalCode !== '' && !/^\d{5}-?\d{3}$/.test(postalCode))
  )
    return invalid();
  return {
    street,
    number,
    noNumber: v.noNumber,
    neighborhood,
    city,
    state,
    country,
    postalCode: postalCode.replace('-', ''),
    complement,
  };
}
export function formatPointAddress(a: PointAddress): string {
  return [
    [a.street, a.noNumber ? 's/n' : a.number, a.complement]
      .filter(Boolean)
      .join(', '),
    a.neighborhood,
    `${a.city}/${a.state}`,
    a.postalCode
      ? `CEP ${a.postalCode.slice(0, 5)}-${a.postalCode.slice(5)}`
      : '',
    'Brasil',
  ]
    .filter(Boolean)
    .join(' — ');
}
export function parseStopReference(input: unknown): string {
  return text(input, 1000);
}
