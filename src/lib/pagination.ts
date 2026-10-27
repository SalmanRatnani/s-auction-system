/** Advance by the rows actually returned, including projects with a lower API cap. */
export async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + 499);
    if (error) throw new Error("Export data could not be loaded");
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
