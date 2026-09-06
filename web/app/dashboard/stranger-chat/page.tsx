import { redirect } from 'next/navigation';

export default function StrangerChatRedirect({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const query = searchParams
    ? new URLSearchParams(
        Object.entries(searchParams).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((item) => [k, item]) : v ? [[k, v]] : []
        )
      ).toString()
    : '';

  redirect(`/dashboard/radar${query ? `?${query}` : ''}`);
}
