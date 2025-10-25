import NextErrorComponent, { ErrorProps } from 'next/error';
import type { NextPageContext } from 'next';

function ErrorPage(props: ErrorProps) {
  return <NextErrorComponent statusCode={props.statusCode} />;
}

ErrorPage.getInitialProps = async (ctx: NextPageContext) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(ctx);
  return errorInitialProps;
};

export default ErrorPage;
