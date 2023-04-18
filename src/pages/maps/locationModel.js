class Location {
  constructor(mainText, secondaryText, latitude, date) {
    this.mainText = mainText;
    this.secondaryText = secondaryText;
    this.latitude = latitude;
    this.longitude = longitude;
    this.date = date;
  }

  // Getter methods
  getMainText() {
    return this.mainText;
  }

  getSecondaryText() {
    return this.secondaryText;
  }

  getLatitude() {
    return this.latitude;
  }

  getLongitude() {
    return this.longitude;
  }
  
  getDate() {
    return this.date;
  }
}

// Firestore data converter
const locationConverter = {
  toFirestore: (location) => {
    return {
      mainText: location.getMainText(),
      secondaryText: location.getSecondaryText(),
      latitude: location.getLatitude(),
      longitude: location.getLongitude(),
      date: location.getDate()
    };
  },
  fromFirestore: (snapshot, options) => {
    const data = snapshot.data(options);
    return new Location(data.mainText, data.secondaryText, data.latitude, data.longitude, data.date);
  }
};
