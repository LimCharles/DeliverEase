import { useState, useEffect, useRef } from "react";
import { db } from "../../services/clientApp";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, setDoc, doc } from "firebase/firestore";

const Maps = () => {
  // ==== Firebase Firestore ====
  // Destructure deliveries collection, loading, and error out of the hook
  const [recentPlacesCollection, recentPlacesLoading, recentPlacesError] =  useCollection(collection(db, "recentPlaces"));

  // Temporary - log deliveries collction
  if (!recentPlacesLoading && recentPlacesCollection) {
    recentPlacesCollection.docs.map((doc) => console.log(doc.data()));
  }

  // Create new delivery
  const saveRecentPlace = async (recentPlace) => {
    await setDoc(doc(db, "recentPlaces", recentPlace), {
      "Location": recentPlace,
    })
  }

  // Loading
  const [loading, setLoading] = useState(false);

  // Modal
  const [modal, openModal] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (ref) {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          openModal(false);
        }
      };

      // Bind the event listener
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [ref]);

  const [address, setAddress] = useState("");
  const [recents, setRecents] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);

  useEffect(() => {}, [address]);

  return (
    <div className="flex flex-row w-screen h-screen">
      {loading ? (
        <div className="flex flex-col justify-center items-center w-full gap-2">
          <p className="font-poppins font-semibold">Loading...</p>
          <p className="font-poppins">Calculating the most optimal route</p>
        </div>
      ) : (
        <>
          <div className="grow">
            <p>Map</p>
          </div>
          <div className="h-full flex flex-col px-16 py-16 justify-between">
            <div className="flex flex-col gap-6">
              <p className="font-poppins">
                Add your first destination by clicking the button!
              </p>
              <button className="flex flex-row items-center justify-center font-poppins text-xs font-normal gap-3 text-[#B1B1B1] rounded-md h-[48px] pl-8 pr-16 py-2 border-[#ADADAD] border-[1px] cursor-pointer" onClick={() => saveRecentPlace("new place")}>
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12.5"
                    cy="12.5"
                    r="12"
                    fill="white"
                    stroke="#ADADAD"
                  />
                  <path d="M12.5 8V17" stroke="#959595" stroke-width="1.25" />
                  <path
                    d="M17 12.5L8 12.5"
                    stroke="#959595"
                    stroke-width="1.25"
                  />
                </svg>
                Press to add address
              </button>
            </div>
            <button
              onClick={() => {
                openModal(true);
              }}
              className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-5"
            >
              Calculate Route Now
            </button>
          </div>
        </>
      )}
      <div
        className={`${
          modal ? "block" : "hidden"
        } fixed inset-0 bg-muted-default bg-opacity-50 transition-opacity flex flex-col items-center justify-center`}
        style={{ zIndex: 2000 }}
      >
        <div
          ref={ref}
          className="flex flex-col min-h-0 max-h-36rem p-6 bg-muted-white rounded-lg w-96 shadow-2xl gap-2"
          style={{ padding: "1.5rem" }}
        >
          <div className="flex flex-col gap-3">
            <p className="font-light ">Add destination here</p>
            <input
              type="search"
              id="default-search"
              className="block w-full p-2 pl-4 text-xs font-light border-[1px] rounded-md focus:outline-0"
              placeholder="Invite by email"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div
            className="grid border-[1.5px] border-[#ADADAD] rounded-md"
            style={{
              gridTemplateRows: `repeat(${3}, minmax(0, 1fr))`,
            }}
          >
            {address != "" ? (
              <></>
            ) : (
              <>
                <div className="p-3 flex flex-row flex-1 items-center justify-between border-b-[1px] border-[#ADADAD] last:border-b-0">
                  <div className="flex flex-row items-center gap-4">
                    <svg
                      width="27"
                      height="25"
                      viewBox="0 0 27 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.1579 20.0921L21.2895 25L19.1316 15.75L26.3158 9.52632L16.8553 8.72368L13.1579 0L9.46053 8.72368L0 9.52632L7.18421 15.75L5.02632 25L13.1579 20.0921Z"
                        fill="black"
                      />
                    </svg>
                    <p>Saved Places</p>
                  </div>
                  <svg
                    width="10"
                    height="14"
                    viewBox="0 0 10 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 2L7.25 7.25L2 12.5"
                      stroke="#00693D"
                      stroke-width="2.86364"
                    />
                  </svg>
                </div>
                <div className="p-3 flex flex-row flex-1 items-center justify-between border-b-[1px] border-[#ADADAD] last:border-b-0">
                  <div className="flex flex-row items-center gap-4">
                    <svg
                      width="25"
                      height="25"
                      viewBox="0 0 25 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24.8262 4.79146L19.1162 0L17.5149 1.89921L23.2249 6.69067L24.8262 4.79146ZM7.29891 1.89921L5.71003 0L0 4.77905L1.60129 6.67825L7.29891 1.89921ZM13.0338 7.62165H11.1718V15.0695L17.068 18.6073L17.999 17.0804L13.0338 14.1385V7.62165ZM12.4131 2.6564C6.24379 2.6564 1.24131 7.65889 1.24131 13.8282C1.24131 19.9975 6.23138 25 12.4131 25C18.5824 25 23.5849 19.9975 23.5849 13.8282C23.5849 7.65889 18.5824 2.6564 12.4131 2.6564ZM12.4131 22.5174C7.60924 22.5174 3.72393 18.6321 3.72393 13.8282C3.72393 9.02433 7.60924 5.13903 12.4131 5.13903C17.217 5.13903 21.1023 9.02433 21.1023 13.8282C21.1023 18.6321 17.217 22.5174 12.4131 22.5174Z"
                        fill="black"
                      />
                    </svg>
                    <div className="flex flex-col ">
                      <p className="text-xs font-bold">Puregold Shadow</p>
                      <p className="text-xs">181 J. Asinas</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-8 items-center">
                    <p className="font-bold opacity-[41%] text-[8px]">8 KM</p>
                    <svg
                      width="10"
                      height="14"
                      viewBox="0 0 10 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 2L7.25 7.25L2 12.5"
                        stroke="#00693D"
                        stroke-width="2.86364"
                      />
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maps;
