const axios = require("axios");

// Define the API endpoint and key
const API_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes    ";
const API_KEY = "AIzaSyAX22JhHcnhXKvT97iyTpbLv2niLZURoUI";

// Recursive function to calculate shortest path
export const calculateRoute = async (places) => {
  const calculateShortestPath = async (index, currentDuration, currentPath) => {
    if (currentPath.length == places.length) {
      // Reached the end of the list, return the current path
      return { path: currentPath, duration: currentDuration };
    } else {
      let shortestPath = null;
      for (let i = 0; i < places.length; i++) {
        // Fix: change index to 0 to check shortest path between all places
        // Skip current place
        if (i === index) {
          continue;
        }

        if (currentPath.includes(places[i])) {
          continue;
        }

        // Calculate departure time based on current duration
        const departureTime = new Date(
          Date.now() + currentDuration * 1000
        ).toISOString();

        const responseBody = {
          origin: {
            location: {
              latLng: {
                latitude: places[index].lat,
                longitude: places[index].lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: places[i].lat,
                longitude: places[i].lng,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          polylineQuality: "OVERVIEW",
          departureTime: departureTime,
          languageCode: "en-US",
          units: "METRIC",
        };

        const headers = {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        };

        // Make API call to calculate distance and duration between current place and next place
        const response = await axios.post(API_ENDPOINT, responseBody, {
          headers,
        });

        const duration = parseInt(response.data.routes[0].duration);

        // Recursively calculate shortest path from next place
        const result = await calculateShortestPath(
          i,
          currentDuration + duration,
          currentPath.concat(places[i])
        );

        // Update shortest path if necessary
        if (!shortestPath || result.duration < shortestPath.duration) {
          shortestPath = result;
        }
      }

      return shortestPath;
    }
  };

  // Call the recursive function with the initial parameters
  return calculateShortestPath(0, 10, [places[0]])
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};
