import L from "leaflet";

export function placePin(name?: string) {
  const element = document.createElement("div");
  element.className = "micro-pin-content";
  if (name) { const label = document.createElement("span"); label.textContent = name; element.append(label); }
  element.append(document.createElement("i"));
  return L.divIcon({ html: element, className: "micro-native-pin", iconSize: [28, 48], iconAnchor: [14, 48] });
}
