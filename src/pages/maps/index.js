import { useState, useEffect, useRef } from "react";
import { db } from "../../services/clientApp";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, setDoc, doc } from "firebase/firestore";
import { GoogleMap } from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";


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

  const [recents, setRecents] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState([]);

  const deletePlace = (place) => {
    let newPlaces = savedPlaces.filter((p) => p !== place);
    console.log(savedPlaces);
    setSavedPlaces(newPlaces);
  };

  // Google Maps Stuff
  const containerStyle = {
    width: "100%",
    height: "100%",
  };

  const [latitude, setLatitude] = useState(14.599512);
  const [longitude, setLongitude] = useState(120.984222);

  useEffect(() => {
    // Get the current location when the component mounts
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      });
    } else {
      setError("Geolocation is not supported in this browser.");
    }
  }, []);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
  });

  const handleSelect = (suggestion) => () => {
    let { description } = suggestion;

    setValue("");
    clearSuggestions();

    let main_text = suggestion.structured_formatting.main_text;
    let secondary_text = suggestion.structured_formatting.secondary_text;
    getGeocode({ address: description }).then((results) => {
      const { lat, lng } = getLatLng(results[0]);
      setSavedPlaces([...savedPlaces, { lat, lng, main_text, secondary_text }]);
    });
    openModal(false);
  };

  const renderSuggestions = () =>
    data.map((suggestion, index) => {
      const {
        place_id,
        structured_formatting: { main_text, secondary_text },
      } = suggestion;

      return (
        <div
          key={index}
          onClick={handleSelect(suggestion)}
          className="h-16 flex flex-row p-4 justify-between items-center border-b-[1px] border-[#ADADAD] last:border-b-0 group cursor-pointer transition-all hover:bg-slate-100"
        >
          <div className="flex flex-col" key={place_id}>
            <p className="font-bold text-sm">{main_text}</p>
            <p className="font-normal text-xs">{secondary_text}</p>
          </div>
          <svg
            className="mr-4 transition-all group-hover:mr-0"
            width="10"
            height="14"
            viewBox="0 0 10 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 2L7.25 7.25L2 12.5"
              stroke="#00693D"
              strokeWidth="2.86364"
            />
          </svg>
        </div>
      );
    });

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const center = {
    lat: latitude,
    lng: longitude,
  };

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
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={10}
            >
              {/* Child components, such as markers, info windows, etc. */}
              <></>
            </GoogleMap>
          </div>
          <div className="h-full flex flex-col px-8 py-16 justify-between w-[35%]">
            <div className="flex flex-col gap-6">
              <p className="font-poppins">
                Add your first destination by clicking the button!
              </p>
              <button
                onClick={() => {
                  openModal(true);
                }}
                className="flex flex-row items-center justify-center font-poppins text-xs font-normal gap-3 text-[#B1B1B1] rounded-md h-[48px] pl-8 pr-16 py-2 border-[#ADADAD] border-[1px] cursor-pointer"
              >
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
                  <path d="M12.5 8V17" stroke="#959595" strokeWidth="1.25" />
                  <path
                    d="M17 12.5L8 12.5"
                    stroke="#959595"
                    strokeWidth="1.25"
                  />
                </svg>
                Press to add address
              </button>
              <div
                id="savedplaces"
                className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-2"
              >
                {savedPlaces.map((place, index) => (
                  <div
                    key={index}
                    className="flex flex-row justify-between border-[1px] rounded-md border-[#E3E3E3] p-4 items-center gap-8 h-16"
                  >
                    <div className="flex flex-row gap-4 items-center">
                      <div
                        className="border-black border-[1px] rounded-[50%] items-center justify-center flex flex-row"
                        style={{
                          height: "40px",
                          width: "40px",
                        }}
                      >
                        <p className="text-center">{index}</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs font-bold">{place.main_text}</p>
                        <p className="text-[10px]">{place.secondary_text}</p>
                      </div>
                    </div>
                    <svg
                      onClick={() => {
                        deletePlace(place);
                      }}
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      className="cursor-pointer"
                      height="16"
                      fill="none"
                    >
                      <path
                        fill="#000"
                        stroke="#EF4444"
                        d="M10.2 4v.5h3.1a.2.2 0 0 1 0 .3h-1.1v7.9a1.5 1.5 0 0 1-1.5 1.5H5.3c-.4 0-.7-.2-1-.5l-.4.4.4-.4c-.3-.3-.5-.6-.5-1V4.8H2.7a.2.2 0 1 1 0-.3h3.1V3.3a1.5 1.5 0 0 1 1.5-1.5h1.4a1.5 1.5 0 0 1 1.5 1.5V4Zm-.9.5h.5V3.3a1.2 1.2 0 0 0-1.1-1.1H7.3a1.2 1.2 0 0 0-1.1 1.1v1.2h3.1Zm-4.6.3h-.5v7.9a1.2 1.2 0 0 0 1.1 1.1h5.4a1.2 1.2 0 0 0 1.1-1.1V4.8H4.7Zm2 6.7a.2.2 0 0 1-.2-.2v-4a.2.2 0 0 1 .3 0v4.2Zm2.8 0a.2.2 0 0 1-.3-.2v-4a.2.2 0 0 1 .3 0v4.2Z"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
            <button className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-5">
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
          className="flex flex-col min-h-0 max-h-36rem p-6 bg-muted-white rounded-lg w-[600px] shadow-2xl gap-2 bg-white"
          style={{ padding: "1.5rem" }}
        >
          <div className="flex flex-col gap-3">
            <p className="font-light ">Add destination here</p>

            <input
              type="location"
              className="block w-full p-2 pl-4 text-xs font-light border-[1px] rounded-md focus:outline-0"
              placeholder="Type address here"
              value={value}
              onChange={handleInput}
            />
          </div>
          <div className="flex flex-col border-[1.5px] border-[#ADADAD] rounded-md">
            {value ? (
              status === "OK" && <>{renderSuggestions()}</>
            ) : (
              <>
                <div className="p-3 flex flex-row flex-1 items-center justify-between border-b-[1px] border-[#ADADAD] last:border-b-0 group">
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
                    <svg
                      className="mr-4 transition-all group-hover:mr-0"
                      width="10"
                      height="14"
                      viewBox="0 0 10 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 2L7.25 7.25L2 12.5"
                        stroke="#00693D"
                        strokeWidth="2.86364"
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
