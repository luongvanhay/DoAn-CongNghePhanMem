import { useEffect, useState } from "react";
import { getContents } from "./services/contentService";

function PlacesExample() {
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContents()
      .then((data) => {
        setPlaces(
          data.filter(
            (place) =>
              place.active === true &&
              Number.isFinite(place.latitude) &&
              Number.isFinite(place.longitude),
          ),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải địa điểm...</p>;

  if (error) {
    return <p>Lỗi tải địa điểm: {error}</p>;
  }

  return (
    <ul>
      {places.map((place) => (
        <li key={place.id}>
          {place.title} — {place.latitude}, {place.longitude}
        </li>
      ))}
    </ul>
  );
}

export default PlacesExample;
