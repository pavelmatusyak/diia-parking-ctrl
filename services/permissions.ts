import { Camera } from "expo-camera";
import * as Location from "expo-location";

export async function requestCameraPermission(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === "granted";
}

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
}

export async function requestAllPermissions() {
    const [camera, location] = await Promise.all([
        requestCameraPermission(),
        requestLocationPermission(),
    ]);

    return { camera, location };
}
