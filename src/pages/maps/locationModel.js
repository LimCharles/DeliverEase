export class LocationModel {
  constructor(mainText, secondaryText, latitude, longitude, date) {
    this.mainText = mainText;
    this.secondaryText = secondaryText;
    this.latitude = latitude;
    this.longitude = longitude;
    this.date = date;
  }
}

// Firestore data converter
export const locationConverter = {
  toFirestore: (location) => {
    return {
      "mainText": location.mainText,
      "secondaryText": location.secondaryText,
      "latitude": location.latitude,
      "longitude": location.longitude,
      "date": Math.floor(location.date.getTime() / 1000),
    };
  },
  fromFirestore: (snapshot, options) => {
    const data = snapshot.data(options);
    return new Location(data.mainText, data.secondaryText, data.latitude, data.longitude, data.date.toDate());
  }
};
