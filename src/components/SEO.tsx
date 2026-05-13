import { Helmet } from "react-helmet-async";

const SITE = "https://quantotempofaz.lovable.app";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function SEO({ title, description, path, noindex }: SEOProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}