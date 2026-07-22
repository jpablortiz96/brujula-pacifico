import municipios from "@/public/data/municipios.json";

export type MunicipioEstatico = {
  divipola: string;
  nombre: string;
  departamento: string;
  codigo_depto: string;
  lat: number | null;
  lng: number | null;
  sisben_pob_vulnerable: number | null;
};

export type MunicipioSeleccionable = Pick<
  MunicipioEstatico,
  "divipola" | "nombre" | "departamento"
> &
  Partial<
    Pick<
      MunicipioEstatico,
      "codigo_depto" | "lat" | "lng" | "sisben_pob_vulnerable"
    >
  > & {
  contratos?: number;
  tiene_datos_ricos?: boolean;
};

const catalogo = municipios as MunicipioEstatico[];

export function getMunicipiosEstaticos(): MunicipioEstatico[] {
  return catalogo;
}
