import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link href="/favicon.png?v=2" rel="icon" type="image/png" />
        <link href="/favicon.png?v=2" rel="shortcut icon" type="image/png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
