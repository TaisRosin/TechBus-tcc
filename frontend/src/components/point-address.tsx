import { useState } from "react";
import { Field, value } from "./common";

export interface PointAddress {
  street: string;
  number: string;
  noNumber: boolean;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  complement: string;
}
export interface PointAddressData {
  address?: string;
  addressDetails?: PointAddress | null;
  legacyAddress?: string | null;
  stopReference?: string;
}
export function pointAddressPayload(f: FormData) {
  return {
    ...(value(f, "addressMode") === "structured"
      ? {
          addressDetails: {
            street: value(f, "street"),
            number: f.has("noNumber") ? "" : value(f, "number"),
            noNumber: f.has("noNumber"),
            neighborhood: value(f, "neighborhood"),
            city: value(f, "city"),
            state: value(f, "state"),
            country: "BR",
            postalCode: value(f, "postalCode"),
            complement: value(f, "complement"),
          },
        }
      : { address: value(f, "address") }),
    stopReference: value(f, "stopReference"),
  };
}
export function PointAddressFields({
  point,
}: {
  point?: PointAddressData | null;
}) {
  const details = point?.addressDetails;
  const [structured, setStructured] = useState(!!details || !point);
  const [noNumber, setNoNumber] = useState(details?.noNumber ?? false);
  return (
    <fieldset style={{ gridColumn: "1 / -1" }}>
      <legend>Endereço do ponto</legend>
      <input
        type="hidden"
        name="addressMode"
        value={structured ? "structured" : "legacy"}
      />
      {point?.legacyAddress && (
        <p className="muted">
          Endereço antigo preservado: {point.legacyAddress}
        </p>
      )}
      {point && !details && (
        <label className="check">
          <input
            type="checkbox"
            checked={structured}
            onChange={(e) => setStructured(e.target.checked)}
          />
          Preencher endereço detalhado
        </label>
      )}
      {structured ? (
        <div className="form-grid">
          <Field label="Rua / logradouro ou localização">
            <input
              name="street"
              defaultValue={details?.street}
              required
              maxLength={200}
              autoComplete="address-line1"
            />
          </Field>
          <Field label="Número">
            <input
              name="number"
              defaultValue={details?.number}
              disabled={noNumber}
              required={!noNumber}
              maxLength={20}
            />
          </Field>
          <label className="check">
            <input
              name="noNumber"
              type="checkbox"
              checked={noNumber}
              onChange={(e) => setNoNumber(e.target.checked)}
            />
            Sem número
          </label>
          <Field label="Complemento (opcional)">
            <input
              name="complement"
              defaultValue={details?.complement}
              maxLength={200}
            />
          </Field>
          <Field label="Bairro (opcional)">
            <input
              name="neighborhood"
              defaultValue={details?.neighborhood}
              maxLength={120}
            />
          </Field>
          <Field label="Cidade">
            <input
              name="city"
              defaultValue={details?.city}
              required
              maxLength={120}
              autoComplete="address-level2"
            />
          </Field>
          <Field label="Estado (UF)">
            <select name="state" defaultValue={details?.state ?? ""} required>
              <option value="">Selecione</option>
              {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
                .split(" ")
                .map((uf) => (
                  <option key={uf}>{uf}</option>
                ))}
            </select>
          </Field>
          <Field label="CEP (opcional)">
            <input
              name="postalCode"
              defaultValue={details?.postalCode}
              inputMode="numeric"
              pattern="[0-9]{5}-?[0-9]{3}"
              maxLength={9}
              autoComplete="postal-code"
            />
          </Field>
          <p className="muted">País: Brasil</p>
        </div>
      ) : (
        <Field label="Endereço do ponto">
          <input
            name="address"
            defaultValue={point?.address}
            required
            maxLength={1000}
          />
        </Field>
      )}
      <Field label="Referência para o motorista (opcional)">
        <textarea
          name="stopReference"
          defaultValue={point?.stopReference}
          maxLength={1000}
          placeholder="Ex.: embarque pelo portão lateral, em frente à farmácia"
        />
      </Field>
    </fieldset>
  );
}
