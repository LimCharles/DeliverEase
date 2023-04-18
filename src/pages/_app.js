import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAX22JhHcnhXKvT97iyTpbLv2niLZURoUI&libraries=places"></script>
      <Component {...pageProps} />
    </>
  );
}
