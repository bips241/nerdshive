import { redirect } from 'next/navigation';

export default function DocSlugPageRedirect({ params }: { params: { slug: string } }) {
  redirect(`/devs/docs/${params.slug}`);
}
