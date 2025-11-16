import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";

type LatLng = {
  latitude: number;
  longitude: number;
};

// ÖRNEK: Lefkoşa merkez taksi durağı koordinatı (temsilî)
const TAXI_STAND: LatLng = {
  latitude: 35.1735,
  longitude: 33.3639,
};

const AVG_DRIVER_SPEED_KMH = 40; // ortalama hız varsayımı

export default function Index() {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [isNight, setIsNight] = useState(false);

  // Gündüz / gece tarifeleri
  const DAY_BASE = 60;
  const DAY_PER_KM = 15;

  const NIGHT_BASE = 80;
  const NIGHT_PER_KM = 18;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLoadingLocation(false);
    })();
  }, []);

  function onMapLongPress(e: MapPressEvent) {
    setDestination(e.nativeEvent.coordinate);
  }

  // İki nokta arası mesafe (km) – Haversine
  function getDistanceKm(a: LatLng, b: LatLng) {
    const R = 6371; // km
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;

    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLon / 2);

    const c =
      2 *
      Math.asin(
        Math.sqrt(
          sin1 * sin1 +
            Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2
        )
      );

    return R * c;
  }

  // Hesaplamalar
  let rideDistanceKm = 0;
  let estimatedFare = 0;
  let driverToPassengerKm = 0;
  let driverEtaMin = 0;

  const baseFare = isNight ? NIGHT_BASE : DAY_BASE;
  const perKm = isNight ? NIGHT_PER_KM : DAY_PER_KM;

  if (currentLocation && destination) {
    rideDistanceKm = getDistanceKm(currentLocation, destination);
    estimatedFare = baseFare + rideDistanceKm * perKm;
  }

  if (currentLocation) {
    // Şoförün durağından yolcunun bulunduğu yere mesafe
    driverToPassengerKm = getDistanceKm(TAXI_STAND, currentLocation);
    driverEtaMin = (driverToPassengerKm / AVG_DRIVER_SPEED_KMH) * 60;
  }

  function handleRequestTaxi() {
    if (!currentLocation || !destination) {
      Alert.alert("Eksik bilgi", "Lütfen haritada gideceğin yeri seç.");
      return;
    }

    const summary =
      `Tarife: ${isNight ? "Gece" : "Gündüz"}\n` +
      `Şoförün sana uzaklığı: ${driverToPassengerKm.toFixed(1)} km (~${driverEtaMin.toFixed(
        0
      )} dk)\n` +
      `Yolculuk mesafesi: ${rideDistanceKm.toFixed(2)} km\n` +
      `Tahmini ücret: ${estimatedFare.toFixed(0)} TL`;

    // Şimdilik sadece gösteriyoruz – buraya Supabase/Firebase isteği eklenir
    console.log("Yeni yolculuk isteği:", {
      isNight,
      pickup: currentLocation,
      destination,
      driverDistanceKm: driverToPassengerKm,
      driverEtaMin,
      rideDistanceKm,
      estimatedFare,
    });

    Alert.alert("Taksi isteği oluşturuldu (demo)", summary);
  }

  if (loadingLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f72ff" />
        <Text style={{ color: "white", marginTop: 8 }}>
          Konum alınıyor...
        </Text>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white", textAlign: "center" }}>
          Konum izni verilmedi. Ayarlardan konum izni açmalısın.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onLongPress={onMapLongPress}
      >
        {/* Şoför durağı */}
        <Marker
          coordinate={TAXI_STAND}
          title="Taksi durağı (örnek)"
          pinColor="gold"
        />

        {/* Yolcu */}
        <Marker
          coordinate={currentLocation}
          title="Buradasın"
          pinColor="blue"
        />

        {/* Hedef */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Gitmek istediğin yer"
            pinColor="red"
          />
        )}
      </MapView>

      {/* Alt panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>KKTC Taksi Hesaplayıcı</Text>
        </View>

        <View style={styles.tariffRow}>
          <Text style={styles.tariffText}>
            Tarife: {isNight ? "Gece" : "Gündüz"}
          </Text>
          <Switch
            value={isNight}
            onValueChange={setIsNight}
            thumbColor={"white"}
          />
        </View>

        <Text style={styles.infoText}>
          Şoför durağı → sana:{" "}
          <Text style={styles.bold}>
            {driverToPassengerKm.toFixed(1)} km (~{driverEtaMin.toFixed(0)} dk)
          </Text>
        </Text>

        {!destination ? (
          <Text style={styles.infoText}>
            Gitmek istediğin yere haritada{" "}
            <Text style={styles.bold}>uzun bas</Text> (long press) ile işaretle.
          </Text>
        ) : (
          <>
            <Text style={styles.infoText}>
              Sen → hedef mesafe:{" "}
              <Text style={styles.bold}>
                {rideDistanceKm.toFixed(2)} km
              </Text>
            </Text>
            <Text style={styles.infoText}>
              Tahmini ücret ({isNight ? "gece" : "gündüz"}):{" "}
              <Text style={styles.bold}>
                {estimatedFare.toFixed(0)} TL
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestTaxi}
            >
              <Text style={styles.buttonText}>Taksi Çağır (demo)</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f14" },
  map: { flex: 1 },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  panelTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tariffRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tariffText: {
    color: "white",
    fontSize: 15,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    marginTop: 2,
  },
  bold: { fontWeight: "700" },
  button: {
    marginTop: 10,
    backgroundColor: "#3f72ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#0f0f14",
    justifyContent: "center",
    alignItems: "center",
  },
});
