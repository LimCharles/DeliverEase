import { useState } from "react";

const Maps = () => {
  const [loading, setLoading] = useState(false);

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
              <button className="flex flex-row items-center justify-center font-poppins text-xs font-normal gap-3 text-[#B1B1B1] rounded-md h-[48px] pl-8 pr-16 py-2 border-[#ADADAD] border-[1px] cursor-pointer">
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
            <button className="font-poppins font-bold flex flex-row justify-center items-center bg-gradient-to-r from-[#0C3777] to-[#00693D] rounded-3xl text-white py-5">
              Calculate Route Now
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Maps;
