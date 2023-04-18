import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../services/clientApp";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  GoogleMap,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { calculateRoute } from "@/services/calculateRoute";
import {
  collection,
  setDoc,
  doc,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import moment from "moment";
import { LocationModel, locationConverter } from "./locationModel.js";

const Maps = () => {
  // ==== Firebase Firestore ====
  // Destructure deliveries collection, loading, and error out of the hook
  // Sort by most recent place searched
  const recentPlacesCollectionRef = collection(db, "recentPlaces");
  const sortedQuery = query(
    recentPlacesCollectionRef,
    orderBy("date", "desc")
  ).withConverter(locationConverter);
  const [recentPlacesCollection, recentPlacesLoading, recentPlacesError] =
    useCollection(sortedQuery);

  // Add new recent place
  const saveRecentPlace = async (recentPlace) => {
    const docRef = doc(
      db,
      "recentPlaces",
      recentPlace.mainText + "-" + recentPlace.secondaryText
    ).withConverter(locationConverter);
    await setDoc(docRef, recentPlace);
  };

  // Watch for changes to the recentPlaces collection and display on-screen
  useEffect(() => {
    if (!recentPlacesLoading && !recentPlacesError) {
      const recentLimit = 3;
      if (recentPlacesCollection.docs.length > recentLimit) {
        // Delete recent places exceeding
        recentPlacesCollection.docs.slice(recentLimit).forEach((doc) => {
          return deleteDoc(doc.ref)
            .then(() => {
              console.log(
                "Recent places exceeding limit successfully deleted!"
              );
            })
            .catch((error) => {
              console.error(
                "Error removing recent places exceeding limit: ",
                error
              );
            });
        });
      } else {
        setRecentPlaces(
          recentPlacesCollection.docs.map((recentPlace) => recentPlace.data())
        );
        console.log(
          recentPlacesCollection.docs.map((recentPlace) => recentPlace.data())
        );
      }
    } else if (recentPlacesError) {
      console.log("Error:", recentPlacesError);
    }
  }, [recentPlacesCollection, recentPlacesLoading, recentPlacesError]);

  // Loading
  const [loading, setLoading] = useState(false);

  // Progress
  const [step, setStep] = useState(0);

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

  const [recentPlaces, setRecentPlaces] = useState([]);
  const [notes, setNotes] = useState("");
  const [secondStepPlace, setSecondStepPlace] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);

  const deletePlace = (place) => {
    let newPlaces = savedPlaces.filter((p) => p !== place);

    setSavedPlaces(newPlaces);
  };

  // Google Maps Stuff
  const containerStyle = {
    width: "100%",
    height: "100%",
  };

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
      setSecondStepPlace({ lat, lng, main_text, secondary_text });
      setStep(1);
    });
    openModal(false);
  };

  const handleRecommend = (place) => {
    const { mainText, secondaryText, latitude, longitude } = place;
    const main_text = mainText;
    const secondary_text = secondaryText;
    const lat = latitude;
    const lng = longitude;
    setValue("");
    clearSuggestions();
    setSecondStepPlace({ lat, lng, main_text, secondary_text });
    setStep(1);
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

  const savePlace = () => {
    const savedPlace = secondStepPlace;
    if (notes) {
      savedPlace["notes"] = notes;
      setNotes("");
    }

    const location = new LocationModel(
      secondStepPlace.main_text,
      secondStepPlace.secondary_text,
      secondStepPlace.lat,
      secondStepPlace.lng,
      new Date()
    );
    saveRecentPlace(location);
    setSavedPlaces([...savedPlaces, secondStepPlace]);
    setSecondStepPlace(null);
    setStep(0);
  };

  const [shortestPath, setShortestPath] = useState(null);
  const [directionResponse, setDirectionResponse] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [duration, setDuration] = useState(null);
  const calculate = () => {
    calculateRoute(savedPlaces).then((result) => {
      let path = result.path;
      setOrigin(result.path[0].lat + "," + result.path[0].lng);
      setDestination(
        result.path[result.path.length - 1].lat +
          "," +
          result.path[result.path.length - 1].lng
      );
      setDuration(moment.duration(result.duration, "seconds"));
      for (let i = 0; i < path.length; i++) {
        path[i] = {
          location: new window.google.maps.LatLng(path[i].lat, path[i].lng),
          stopover: true,
        };
      }
      setShortestPath(path);
      setStep(2);
    });
  };

  const currentTime = moment();

  const [center, setCenter] = useState({
    lat: 14.6398614,
    lng: 121.0784939,
  });
  const mapRef = useRef(null);
  const handleCenterChanged = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      console.log("New Center:", center);
      // Perform any logic with the new center coordinates here
    }
  }, []);
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
              ref={mapRef}
              center={center}
              mapContainerStyle={containerStyle}
              zoom={13}
            >
              {shortestPath != null && (
                <>
                  <DirectionsService
                    options={{
                      destination: destination,
                      origin: origin,
                      waypoints: shortestPath.length <= 2 ? [] : shortestPath,
                      travelMode: "DRIVING",
                    }}
                    callback={(response) => {
                      setDirectionResponse(response);
                    }}
                  />
                  <DirectionsRenderer
                    options={{
                      directions: directionResponse,
                    }}
                  />
                </>
              )}
            </GoogleMap>
          </div>
          <div className="h-full flex flex-col py-16 justify-between w-[35%]">
            {step == 0 ? (
              <div className="mx-8 flex flex-col justify-between h-full">
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
                      <path
                        d="M12.5 8V17"
                        stroke="#959595"
                        strokeWidth="1.25"
                      />
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
                        className="flex flex-row justify-between border-[1px] rounded-md border-[#E3E3E3] p-4 items-center gap-8 h-18"
                      >
                        <div className="flex flex-row gap-4 items-center">
                          <div
                            className="border-black border-[1px] rounded-[50%] items-center justify-center flex flex-row"
                            style={{
                              height: "40px",
                              width: "40px",
                            }}
                          >
                            <p className="text-center">{index + 1}</p>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-bold">
                              {place.main_text}
                            </p>
                            <p className="text-[10px]">
                              {place.secondary_text}
                            </p>
                            <p className="text-[8px]">
                              {place.notes && place.notes}
                            </p>
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
                <button
                  onClick={() => {
                    calculate();
                  }}
                  className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-5"
                >
                  Calculate Route Now
                </button>
              </div>
            ) : step == 1 ? (
              <div className="mx-8 flex flex-col border-[1px] border-[#E3E3E3] rounded-md py-4 px-16 gap-8">
                <div className="flex flex-col">
                  <p className="font-bold text-sm">
                    {secondStepPlace?.main_text}
                  </p>
                  <p className="font-normal text-xs">
                    {secondStepPlace?.secondary_text}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-sm">Add notes for delivery</p>
                  <textarea
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                    className="border-[1px] rounded-sm border-[#E3E3E3] resize-none outline-none p-4 text-xs font-light text-[#000000] h-40"
                    placeholder="Type notes here"
                  ></textarea>
                </div>
                <button
                  onClick={() => {
                    savePlace();
                  }}
                  className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-3 w-[60%]"
                >
                  Add Address
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8 h-full">
                <div className="flex flex-col gap-6 shadow-xl px-16 pb-10">
                  <div className="flex flex-row gap-4 items-center">
                    <svg
                      width="31"
                      height="36"
                      viewBox="0 0 31 36"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20.1818 0H10.0909V3.36364H20.1818V0ZM13.4545 21.8636H16.8182V11.7727H13.4545V21.8636ZM26.9595 10.7468L29.3477 8.35864C28.6245 7.50091 27.8341 6.69364 26.9764 5.98727L24.5882 8.37545C21.9814 6.29 18.7018 5.04545 15.1364 5.04545C6.77773 5.04545 0 11.8232 0 20.1818C0 28.5405 6.76091 35.3182 15.1364 35.3182C23.5118 35.3182 30.2727 28.5405 30.2727 20.1818C30.2727 16.6164 29.0282 13.3368 26.9595 10.7468ZM15.1364 31.9545C8.62773 31.9545 3.36364 26.6905 3.36364 20.1818C3.36364 13.6732 8.62773 8.40909 15.1364 8.40909C21.645 8.40909 26.9091 13.6732 26.9091 20.1818C26.9091 26.6905 21.645 31.9545 15.1364 31.9545Z"
                        fill="black"
                      />
                    </svg>
                    <div className="flex flex-col">
                      <p className="font-bold text-xs">Start Time:</p>
                      <p className="font-light text-xs">
                        {currentTime.format("hh:mm A")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 items-center">
                    <svg
                      width="33"
                      height="37"
                      viewBox="0 0 33 37"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M29.0786 5.97045L26.6905 8.35864C24.0836 6.29 20.8041 5.04545 17.2386 5.04545C14.1609 5.04545 11.3018 5.97045 8.91364 7.53455L11.3691 9.99C13.0845 8.99773 15.1027 8.40909 17.2386 8.40909C23.7473 8.40909 29.0114 13.6732 29.0114 20.1818C29.0114 22.3177 28.4227 24.3359 27.4305 26.0514L29.8691 28.49C31.45 26.1186 32.375 23.2595 32.375 20.1818C32.375 16.6164 31.1305 13.3368 29.0618 10.7468L31.45 8.35864L29.0786 5.97045ZM22.2841 0H12.1932V3.36364H22.2841V0ZM15.5568 14.1945L18.9205 17.5582V11.7727H15.5568V14.1945ZM2.13591 5.04545L0 7.18136L4.625 11.8232C3.02727 14.2114 2.10227 17.0873 2.10227 20.1818C2.10227 28.5405 8.86318 35.3182 17.2386 35.3182C20.3332 35.3182 23.2091 34.3932 25.6141 32.7955L29.8186 37L31.9545 34.8641L18.9877 21.8973L2.13591 5.04545ZM17.2386 31.9545C10.73 31.9545 5.46591 26.6905 5.46591 20.1818C5.46591 18.0291 6.05454 16.0109 7.06364 14.2618L23.1418 30.34C21.4095 31.3659 19.3914 31.9545 17.2386 31.9545Z"
                        fill="black"
                      />
                    </svg>

                    <div className="flex flex-col">
                      <p className="font-bold text-xs">End Time:</p>
                      <p className="font-light text-xs">
                        {currentTime.clone().add(duration).format("hh:mm A")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4 items-center">
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 34 34"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M23.9491 9.68727C21.9814 7.71955 19.4082 6.72727 16.8182 6.72727V16.8182L9.68727 23.9491C13.6227 27.8845 20.0136 27.8845 23.9659 23.9491C27.9014 20.0136 27.9014 13.6227 23.9491 9.68727ZM16.8182 0C7.53454 0 0 7.53454 0 16.8182C0 26.1018 7.53454 33.6364 16.8182 33.6364C26.1018 33.6364 33.6364 26.1018 33.6364 16.8182C33.6364 7.53454 26.1018 0 16.8182 0ZM16.8182 30.2727C9.38455 30.2727 3.36364 24.2518 3.36364 16.8182C3.36364 9.38455 9.38455 3.36364 16.8182 3.36364C24.2518 3.36364 30.2727 9.38455 30.2727 16.8182C30.2727 24.2518 24.2518 30.2727 16.8182 30.2727Z"
                        fill="black"
                      />
                    </svg>
                    <div className="flex flex-col">
                      <p className="font-bold text-xs">Total Duration:</p>
                      <p className="font-light text-xs">
                        {duration.minutes()} minutes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col h-full justify-between mx-8 gap-4">
                  <div className="flex flex-col h-72 overflow-y-auto gap-4">
                    {savedPlaces.map((place, index) => (
                      <div
                        key={index}
                        className="flex flex-row justify-between border-[1px] rounded-md border-[#E3E3E3] p-4 items-center gap-8 h-18"
                      >
                        <div className="flex flex-row gap-4 items-center">
                          <div
                            className="border-black border-[1px] rounded-[50%] items-center justify-center flex flex-row"
                            style={{
                              height: "40px",
                              width: "40px",
                            }}
                          >
                            <p className="text-center">{index + 1}</p>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-bold">
                              {place.main_text}
                            </p>
                            <p className="text-[10px]">
                              {place.secondary_text}
                            </p>
                            <p className="text-[8px]">
                              {place.notes && place.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setStep(0);
                      setSavedPlaces([]);
                    }}
                    className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-5 gap-6"
                  >
                    <svg
                      width="39"
                      height="43"
                      viewBox="0 0 39 43"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M31.875 29.92C30.26 29.92 28.815 30.5575 27.71 31.5563L12.5588 22.7375C12.665 22.2487 12.75 21.76 12.75 21.25C12.75 20.74 12.665 20.2513 12.5588 19.7625L27.54 11.0288C28.6875 12.0913 30.1962 12.75 31.875 12.75C35.4025 12.75 38.25 9.9025 38.25 6.375C38.25 2.8475 35.4025 0 31.875 0C28.3475 0 25.5 2.8475 25.5 6.375C25.5 6.885 25.585 7.37375 25.6912 7.8625L10.71 16.5963C9.5625 15.5338 8.05375 14.875 6.375 14.875C2.8475 14.875 0 17.7225 0 21.25C0 24.7775 2.8475 27.625 6.375 27.625C8.05375 27.625 9.5625 26.9662 10.71 25.9037L25.84 34.7438C25.7337 35.19 25.67 35.6575 25.67 36.125C25.67 39.5462 28.4538 42.33 31.875 42.33C35.2962 42.33 38.08 39.5462 38.08 36.125C38.08 32.7038 35.2962 29.92 31.875 29.92Z"
                        fill="white"
                      />
                    </svg>
                    Send Directions
                  </button>
                </div>
              </div>
            )}
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
          className="flex flex-col min-h-0 rem p-6 bg-muted-white rounded-lg w-[600px] shadow-2xl gap-2 bg-white"
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
                {recentPlaces.map((place, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      handleRecommend(place);
                    }}
                    className="p-3 flex flex-row flex-1 items-center justify-between border-b-[1px] border-[#ADADAD] cursor-pointer last:border-b-0 group"
                  >
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

                      <div className="flex flex-col">
                        <p className="text-xs font-bold">{place.mainText}</p>
                        <p className="text-[10px]">{place.secondaryText}</p>
                        <p className="text-[8px]">{place.date.toString()}</p>
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
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maps;
