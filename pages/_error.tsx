import NextErrorComponent, { ErrorProps } from 'next/error';
import type { NextPageContext } from 'next';

function ErrorPage(props: ErrorProps) {
  return <NextErrorComponent statusCode={props.statusCode} />;
}

ErrorPage.getInitialProps = async (ctx: NextPageContext) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(ctx);
  try {
    const locale = (ctx as any).locale ?? 'en';
    const sst = await serverSideTranslations(locale, ['common']);
    return { ...errorInitialProps, ...sst };
  } catch {
    return errorInitialProps;
  }
};

export default ErrorPage;
