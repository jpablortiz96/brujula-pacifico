const BASE = "https://www.datos.gov.co/resource";

export interface SocrataParams {
  where?: string;
  select?: string;
  limit?: number;
  offset?: number;
  order?: string;
  q?: string;
}

export class SocrataError extends Error {
  constructor(
    public readonly datasetId: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "SocrataError";
  }
}

export async function fetchSocrata<T = Record<string, unknown>>(
  datasetId: string,
  params: SocrataParams = {}
): Promise<T[]> {
  const url = new URL(`${BASE}/${datasetId}.json`);

  if (params.where)  url.searchParams.set("$where",  params.where);
  if (params.select) url.searchParams.set("$select", params.select);
  if (params.limit)  url.searchParams.set("$limit",  String(params.limit));
  if (params.offset) url.searchParams.set("$offset", String(params.offset));
  if (params.order)  url.searchParams.set("$order",  params.order);
  if (params.q)      url.searchParams.set("$q",      params.q);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new SocrataError(
      datasetId,
      res.status,
      `Socrata ${datasetId} → ${res.status}: ${text.slice(0, 200)}`
    );
  }

  return res.json() as Promise<T[]>;
}

export async function fetchSocrataPaginated<T = Record<string, unknown>>(
  datasetId: string,
  params: Omit<SocrataParams, "offset"> = {},
  pageSize = 1000,
  maxPages = 100
): Promise<T[]> {
  const out: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchSocrata<T>(datasetId, {
      ...params,
      limit: pageSize,
      offset: page * pageSize,
    });

    out.push(...batch);

    if (batch.length < pageSize) break;

    await new Promise((r) => setTimeout(r, 300));
  }

  return out;
}

export async function countSocrata(
  datasetId: string,
  where?: string
): Promise<number> {
  const rows = await fetchSocrata<{ count: string }>(datasetId, {
    select: "count(*) as count",
    where,
    limit: 1,
  });
  return parseInt(rows[0]?.count ?? "0", 10);
}
