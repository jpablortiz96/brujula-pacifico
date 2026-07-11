export interface Municipio {
  divipola: string;
  nombre: string;
  departamento: string;
  codigo_depto: string;
  region: string | null;
  poblacion: number | null;
  nbi_pct: number | null;
  lat: number | null;
  lng: number | null;
}

export interface ContratoSecop {
  id: string;
  referencia_contrato: string | null;
  nombre_entidad: string | null;
  nit_entidad: string | null;
  departamento: string | null;
  ciudad: string | null;
  codigo_municipio: string | null;
  objeto_contrato: string | null;
  tipo_contrato: string | null;
  modalidad_contratacion: string | null;
  estado_contrato: string | null;
  proveedor_adjudicado: string | null;
  valor_contrato: number | null;
  valor_pagado: number | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  duracion: number | null;
  url_proceso: string | null;
}

export interface DashboardKPIs {
  total_contratos: number;
  valor_total_cop: number;
  municipios_cubiertos: number;
  entidades_distintas: number;
  fecha_min: string | null;
  fecha_max: string | null;
}

export interface MunicipioStats {
  divipola: string;
  nombre: string;
  departamento: string;
  lat: number | null;
  lng: number | null;
  contratos: number;
  valor_total: number;
}

export interface DashboardFilters {
  departamento?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  valorMin?: number | null;
  valorMax?: number | null;
  busqueda?: string | null;
}
