import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ToastContainer } from "react-toastify/unstyled";


export default function App({ Component, pageProps }: AppProps) {
  return <>
  <Head>
    <title>Code-Quest</title>
    <link rel="icon" href="/logo.png" />
  </Head>
  <ToastContainer />
  <Component {...pageProps} />
  </>
}
