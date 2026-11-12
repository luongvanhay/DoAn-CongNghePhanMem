import { useEffect, useMemo, useRef, useState } from "react";
import { getContents, recordActivePresence, recordVisit } from "./services/contentService";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import { languages, messages, supportedLanguageCodes } from "./i18n";
import StaffDashboard from "./pages/Staff/StaffDashboard.jsx";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import {
  MapPin,
  Navigation,
  Search,
  Languages,
  Headphones,
  MessageCircle,
  Menu,
  Compass,
  Volume2,
  LocateFixed,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./App.css";

const DEFAULT_POSITION = [16.003, 108.264];
const translationCache = new Map();

function mapApiPlace(item) {
  return {
    id: item.id,
    name: item.title || "Địa điểm chưa có tên",
    category: item.location || "Điểm tham quan",
    description: item.body || "Chưa có nội dung thuyết minh.",
    imageUrl: item.imageUrl || "",
    position: [Number(item.latitude), Number(item.longitude)],
    icon: "📍",
    sourceLanguage: item.sourceLanguage || "vi",
    translations: Array.isArray(item.translations) ? item.translations : [],
  };
}

// Ưu tiên bản dịch do quản trị viên lưu trong MongoDB.
function localizePlace(place, language) {
  if (!language || language === place.sourceLanguage) {
    return place;
  }

  const translation = place.translations.find(
    (item) => item.languageCode === language,
  );

  if (!translation) {
    return place;
  }

  return {
    ...place,
    name: translation.title || place.name,
    description: translation.description || place.description,
  };
}

async function translateText(text, source, target) {
  if (!text || source === target) {
    return text;
  }

  const cacheKey = `translation:${source}:${target}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch("/api/translation/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source, target }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.translated_text) {
    throw new Error(
      data.message || `Dịch nội dung thất bại (HTTP ${response.status}).`,
    );
  }

  translationCache.set(cacheKey, data.translated_text);
  return data.translated_text;
}

async function translatePlace(place, language) {
  const savedTranslation = place.translations.find(
    (item) => item.languageCode === language,
  );
  const source = place.sourceLanguage || "vi";

  if (savedTranslation) {
    const savedTitle = savedTranslation.title?.trim();
    const [name, category, description] = await Promise.all([
      savedTitle && savedTitle !== place.name.trim()
        ? savedTitle
        : translateText(place.name, source, language),
      translateText(place.category, source, language),
      savedTranslation.description?.trim()
        ? savedTranslation.description
        : translateText(place.description, source, language),
    ]);

    return { ...place, name, category, description };
  }

  const separator = `[[FIELD_${Math.random().toString(36).slice(2)}]]`;
  const translatedFields = await translateText(
    [place.name, place.category, place.description].join(`\n${separator}\n`),
    source,
    language,
  );
  const fields = translatedFields.split(separator).map((field) => field.trim());

  if (fields.length !== 3) {
    const individualFields = await Promise.all([
      translateText(place.name, source, language),
      translateText(place.category, source, language),
      translateText(place.description, source, language),
    ]);
    return {
      ...place,
      name: individualFields[0],
      category: individualFields[1],
      description: individualFields[2],
    };
  }

  return {
    ...place,
    name: fields[0],
    category: fields[1],
    description: fields[2],
  };
}

// Điều khiển bản đồ khi chọn POI hoặc xác định GPS.
function MapController({ place, userPosition, route }) {
  const map = useMap();

  useEffect(() => {
    if (route?.coordinates?.length) {
      map.fitBounds(route.coordinates, { padding: [48, 48], maxZoom: 16 });
      return;
    }
    if (place) {
      map.flyTo(place.position, 17, { duration: 1 });
    }
  }, [map, place, route]);

  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 17, { duration: 1 });
    }
  }, [map, userPosition]);

  return null;
}

function LanguageSelection({ onSelect }) {
  return (
    <main className="language-selection">
      <section className="language-selection-card">
        <span className="language-selection-brand" aria-hidden="true">
          🪷
        </span>
        <p className="eyebrow">KHÁM PHÁ VÀ DU LỊCH</p>
        <h1>Chào Mừng Đến Với Hệ Thống Thuyết Minh Tự Động</h1>
        <p className="language-selection-description">
          Chọn ngôn ngữ để xem trang web và nghe thuyết minh. Bạn có thể đổi
          ngôn ngữ bất cứ lúc nào.
        </p>
        <div className="language-selection-primary">
          <Languages size={17} />
          Tiếng Việt là ngôn ngữ chính
        </div>
        <div className="language-selection-grid">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`language-option ${item.code === "vi" ? "primary" : ""}`}
              onClick={() => onSelect(item.code)}
            >
              <span>{item.nativeName}</span>
              <small>{item.code === "vi" ? "Mặc định" : item.label}</small>
            </button>
          ))}
        </div>
        <p className="language-selection-footer">
          Hệ thống thuyết minh tự động · Bán đảo Sơn Trà, Đà Nẵng
        </p>
        <p className="language-selection-privacy">
          Website chỉ lưu mã khách ngẫu nhiên, thời điểm truy cập và ngôn ngữ đã
          chọn để thống kê; không lưu tên, email hay mật khẩu.
        </p>
        <nav className="language-selection-links" aria-label="Tài khoản và đăng ký địa điểm">
          <a href="/login?audience=user">Đăng nhập người dùng</a>
          <a href="/login?audience=staff">Đăng nhập nhân viên</a>
          <a className="primary" href="/poi-owner/register">Đăng ký địa điểm</a>
        </nav>
      </section>
    </main>
  );
}

function MapApp({ language, onChangeLanguage, onOpenLanguageSelection }) {
  const text = messages[language] || messages.vi;
  const [localizedPlaces, setLocalizedPlaces] = useState([]);
  const [selectedRaw, setSelected] = useState(null);
  const [translationError, setTranslationError] = useState("");
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const places = localizedPlaces;
  const selected = useMemo(
    () =>
      selectedRaw
        ? places.find((place) => place.id === selectedRaw.id) || selectedRaw
        : null,
    [places, selectedRaw],
  );
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setRoute(null);
      setRouteError("");
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [selected?.id]);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [audioPlayback, setAudioPlayback] = useState({
    status: "idle",
    placeId: null,
    language: null,
    description: null,
  });
  const playbackMatchesSelection =
    audioPlayback.placeId === selected?.id &&
    audioPlayback.language === language &&
    audioPlayback.description === selected?.description;
  const playing =
    playbackMatchesSelection && audioPlayback.status === "playing";
  const audioLoading =
    playbackMatchesSelection && audioPlayback.status === "loading";
  const audioRef = useRef(null);
  const audioRequestRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const mapCenter = selected?.position || position || DEFAULT_POSITION;

  // Tải POI từ backend.
  useEffect(() => {
    let cancelled = false;

    async function loadPlaces() {
      try {
        const data = await getContents();

        if (!cancelled) {
          setApiError("");
          setTranslationError("");
        }

        if (!Array.isArray(data)) {
          throw new Error("API không trả về danh sách địa điểm hợp lệ.");
        }

        const validPlaces = data
          .filter((item) => {
            if (!item || item.active !== true) {
              return false;
            }

            if (
              item.latitude == null ||
              item.longitude == null ||
              item.latitude === "" ||
              item.longitude === ""
            ) {
              return false;
            }

            const lat = Number(item.latitude);
            const lng = Number(item.longitude);

            return (
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            );
          })
          .map(mapApiPlace);

        const localized = await Promise.all(
          validPlaces.map(async (place) => {
            try {
              return await translatePlace(place, language);
            } catch (error) {
              if (!cancelled) {
                setTranslationError(error?.message || text.translationError);
              }
              return {
                ...localizePlace(place, language),
                translationMissing: language !== place.sourceLanguage,
              };
            }
          }),
        );

        if (!cancelled) {
          setLocalizedPlaces(localized);

          setSelected((current) => {
            if (localized.length === 0) {
              return null;
            }

            return (
              localized.find((place) => place.id === current?.id) ||
              localized[0]
            );
          });
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error?.message || "Không thể tải dữ liệu địa điểm.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlaces();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, language, text.translationError]);

  // Stop audio when the selected narration changes or the page is left.
  useEffect(() => {
    return () => {
      audioRequestRef.current?.abort();
      audioRequestRef.current = null;

      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      }
    };
  }, [selected?.id, selected?.description, language]);

  const filteredPlaces = places.filter((place) =>
    place.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function retryLoadPlaces() {
    setReloadKey((key) => key + 1);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setGpsMessage("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setGpsMessage("Đang xác định vị trí...");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentPosition = [coords.latitude, coords.longitude];

        setPosition(currentPosition);
        setGpsMessage("Đã xác định vị trí của bạn.");
      },
      (error) => {
        if (error.code === 1) {
          setGpsMessage(
            "Bạn chưa cấp quyền định vị. Hãy cho phép trình duyệt truy cập vị trí.",
          );
        } else if (error.code === 3) {
          setGpsMessage("Định vị quá thời gian chờ. Vui lòng thử lại.");
        } else {
          setGpsMessage(
            "Không lấy được vị trí. Hãy kiểm tra GPS và quyền định vị.",
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  function openDirections() {
    if (!selected) {
      setGpsMessage(text.noPlaces);
      return;
    }

    if (!position) {
      setRouteError(language === "vi"
        ? "Hãy bật định vị để xem đường đi từ vị trí hiện tại."
        : "Enable location to see a route from your current position.");
      locateMe();
      return;
    }

    setRoute(null);
    setRouteError("");
    setRouteLoading(true);
    const [fromLat, fromLng] = position;
    const [toLat, toLng] = selected.position;
    fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.code !== "Ok" || !data.routes?.length) {
          throw new Error(language === "vi" ? "Không tìm thấy tuyến đường." : "No route found.");
        }
        const bestRoute = data.routes[0];
        setRoute({
          coordinates: bestRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distance: bestRoute.distance,
          duration: bestRoute.duration,
        });
      })
      .catch((error) => setRouteError(error.message || (language === "vi" ? "Không thể tải tuyến đường." : "Could not load route.")))
      .finally(() => setRouteLoading(false));
  }

  function toggleAudio() {
    if (!selected) {
      setGpsMessage(text.noPlaces);
      return;
    }

    if (selected.translationMissing) {
      setGpsMessage(text.translationError);
      return;
    }

    if (playing || audioLoading) {
      audioRequestRef.current?.abort();
      audioRequestRef.current = null;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      }

      setAudioPlayback({
        status: "idle",
        placeId: null,
        language: null,
        description: null,
      });
      return;
    }

    const controller = new AbortController();
    audioRequestRef.current = controller;
    setGpsMessage("");
    const narration = {
      placeId: selected.id,
      language,
      description: selected.description,
    };
    setAudioPlayback({ ...narration, status: "loading" });

    async function playNarration() {
      try {
        const response = await fetch("/api/tts/audio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: selected.description,
            lang:
              languages.find((item) => item.code === language)?.tts || language,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`${text.narrationError} (HTTP ${response.status})`);
        }

        if (controller.signal.aborted) {
          return;
        }

        const audioUrl = URL.createObjectURL(await response.blob());
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setAudioPlayback({ ...narration, status: "idle" });
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setAudioPlayback({ ...narration, status: "idle" });
          setGpsMessage(text.narrationError);
        };

        await audio.play();
        if (controller.signal.aborted) {
          audio.pause();
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          return;
        }

        setAudioPlayback({ ...narration, status: "playing" });
      } catch (error) {
        if (error.name !== "AbortError") {
          if (audioRef.current?.src.startsWith("blob:")) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          audioRef.current?.pause();
          audioRef.current = null;
          setAudioPlayback({ ...narration, status: "idle" });
          setGpsMessage(text.narrationError);
        }
      } finally {
        if (audioRequestRef.current === controller) {
          audioRequestRef.current = null;
        }
      }
    }

    playNarration();
  }

  function askQuestion(event) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    if (!selected) {
      setAnswer(text.noPlaces);
      setQuestion("");
      return;
    }

    setAnswer(`${selected.name}. ${text.fromBackend}`);

    setQuestion("");
  }

  return (
    <div className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">🪷</span>
          <span>
            <strong>{text.appName}</strong>
            <small>SMART PILGRIMAGE</small>
          </span>
        </a>

        <nav className="desktop-nav">
          <a className="nav-active" href="#map">
            {text.navMap}
          </a>
          <a href="#places">{text.navPlaces}</a>
          <a href="#guide">{text.navNarration}</a>
        </nav>

        <label className="language-picker">
          <Languages size={17} />
          <select
            value={language}
            onChange={(event) => onChangeLanguage(event.target.value)}
            aria-label={text.changeLanguage}
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="language-change-button"
          type="button"
          onClick={onOpenLanguageSelection}
        >
          {text.changeLanguage}
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              <Compass size={15} /> {text.heroKicker}
            </span>

            <h1>{text.heroTitle}</h1>

            <p>{text.heroDescription}</p>

            <button
              className="primary-button"
              onClick={() =>
                document.getElementById("map")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              <Navigation size={18} />
              {text.start}
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>{String(places.length).padStart(2, "0")}</strong>
              <span>{text.placeCount}</span>
            </div>
            <div>
              <strong>GPS</strong>
              <span>{text.gps}</span>
            </div>
            <div>
              <strong>{String(languages.length).padStart(2, "0")}</strong>
              <span>{text.languageCount}</span>
            </div>
          </div>
        </section>

        <section className="explorer" id="map">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{text.mapKicker}</span>
              <h2>{text.mapTitle}</h2>
              <p>{text.mapDescription}</p>
            </div>

            <button className="outline-button" onClick={locateMe}>
              <LocateFixed size={17} />
              {text.myLocation}
            </button>
          </div>

          {loading && (
            <div className="status-message" role="status">
              {text.loadingPlaces}
            </div>
          )}

          {apiError && (
            <div className="status-message" role="alert">
              <p>
                {text.loadError}: {apiError}
              </p>
              <button className="outline-button" onClick={retryLoadPlaces}>
                {text.retry}
              </button>
            </div>
          )}

          {!loading && !apiError && places.length === 0 && (
            <div className="status-message" role="status">
              {text.noPlaces}
            </div>
          )}

          {loading && language !== "vi" && (
            <div className="status-message" role="status">
              {text.loadingTranslation}
            </div>
          )}

          {translationError && (
            <div className="status-message" role="alert">
              {text.translationError} {translationError}
            </div>
          )}

          {gpsMessage && (
            <div className="status-message" role="status">
              {gpsMessage}
            </div>
          )}

          <div className="explorer-grid">
            <aside className="places-panel" id="places">
              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder={text.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={text.search}
                />
              </div>

              <div className="places-count">
                {text.placesList}
                <span>{filteredPlaces.length}</span>
              </div>

              <div className="place-list">
                {filteredPlaces.map((place, index) => (
                  <button
                    key={place.id}
                    className={`place-item ${
                      selected?.id === place.id ? "place-selected" : ""
                    }`}
                    onClick={() => setSelected(place)}
                  >
                    <span className="place-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="place-info">
                      <strong>{place.name}</strong>
                      <small>{place.category}</small>
                    </span>

                    <span className="place-arrow">↗</span>
                  </button>
                ))}

                {filteredPlaces.length === 0 && (
                  <p className="empty-state">
                    {places.length === 0 ? text.noPlace : text.noMatch}
                  </p>
                )}
              </div>

              <div className="guide-card" id="guide">
                <span className="guide-icon">
                  <Headphones size={21} />
                </span>

                <div>
                  <strong>{text.guideTitle}</strong>
                  <p>{text.guideDescription}</p>
                </div>

                <button
                  className="round-button"
                  onClick={toggleAudio}
                  disabled={selected?.translationMissing}
                  aria-label={
                    playing || audioLoading
                      ? text.stopNarration
                      : text.playNarration
                  }
                >
                  <Volume2 size={19} />
                </button>
              </div>
            </aside>

            <div className="map-panel">
              <MapContainer
                center={mapCenter}
                zoom={16}
                scrollWheelZoom
                className="leaflet-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {places.map((place) => (
                  <CircleMarker
                    key={place.id}
                    center={place.position}
                    radius={selected?.id === place.id ? 11 : 7}
                    pathOptions={{
                      color: selected?.id === place.id ? "#ffffff" : "#216b50",
                      fillColor:
                        selected?.id === place.id ? "#c49a55" : "#216b50",
                      fillOpacity: 1,
                      weight: 3,
                    }}
                    eventHandlers={{
                      click: () => setSelected(place),
                    }}
                  >
                    <Popup>
                      <strong>{place.name}</strong>
                      <br />
                      {place.category}
                      <br />
                      <button onClick={() => setSelected(place)}>
                        {text.start}
                      </button>
                    </Popup>
                  </CircleMarker>
                ))}

                {position && (
                  <CircleMarker
                    center={position}
                    radius={9}
                    pathOptions={{
                      color: "#ffffff",
                      fillColor: "#2674e8",
                      fillOpacity: 1,
                      weight: 3,
                    }}
                  >
                    <Popup>{text.currentPosition}</Popup>
                  </CircleMarker>
                )}

                {route?.coordinates && (
                  <Polyline
                    positions={route.coordinates}
                    pathOptions={{ color: "#2674e8", weight: 6, opacity: 0.85 }}
                  />
                )}

                <MapController place={selected} userPosition={position} route={route} />
              </MapContainer>

              <div className="map-label">
                <MapPin size={16} />
                <span>{text.mapLabel}</span>
              </div>

              {(routeLoading || route || routeError) && (
                <div className="map-route-status" role="status">
                  {routeLoading
                    ? (language === "vi" ? "Đang tìm đường đi…" : "Finding route…")
                    : route
                      ? `${language === "vi" ? "Tuyến đường" : "Route"}: ${(route.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(route.duration / 60))} min`
                      : routeError}
                </div>
              )}

              <button
                className="map-locate"
                onClick={locateMe}
                aria-label={text.myLocation}
              >
                <LocateFixed size={19} />
              </button>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <div className="detail-image">
            <img
              className="detail-image-photo"
              src={selected?.imageUrl || "/Chùa-Linh-Ứng-Bãi-Bụt1.jpg"}
              alt={selected?.name || text.category}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="detail-image-overlay">
              <span>{text.currentPlace}</span>
              <h2>{selected?.name || text.category}</h2>
            </div>
          </div>

          <div className="detail-content">
            <span className="eyebrow">{text.detailKicker}</span>

            <h2>{selected?.name || text.category}</h2>

            <span className="category-tag">
              {selected?.category || text.category}
            </span>

            <p>{selected?.description || text.fallback}</p>

            <div className="detail-actions">
              <button
                className="outline-button"
                onClick={openDirections}
                disabled={!selected}
              >
                <Navigation size={18} />
                {routeLoading
                  ? (language === "vi" ? "Đang tìm đường…" : "Finding route…")
                  : (language === "vi" ? "Chỉ đường trên bản đồ" : "Show route on map")}
              </button>

              <button
                className="primary-button"
                onClick={toggleAudio}
                disabled={selected?.translationMissing}
              >
                <Headphones size={18} />
                {audioLoading
                  ? text.creatingVoice
                  : playing
                    ? text.stopNarration
                    : text.playNarration}
              </button>

              <button
                className="outline-button"
                onClick={() => setChatOpen(true)}
              >
                <MessageCircle size={18} />
                {text.askGuide}
              </button>
            </div>

            <p className="demo-note">
              {selected ? text.fromBackend : text.noPlaces}
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="brand">
          <span className="brand-icon">🪷</span>
          <strong>{text.appName}</strong>
        </div>
        <span>{text.footer}</span>
      </footer>

      <button
        className="chat-fab"
        onClick={() => setChatOpen((open) => !open)}
        aria-label={chatOpen ? "×" : text.chatbot}
      >
        {chatOpen ? <Menu size={23} /> : <MessageCircle size={23} />}
      </button>

      {chatOpen && (
        <section className="chat-window">
          <div className="chat-header">
            <span className="chat-avatar">🪷</span>

            <div>
              <strong>{text.chatbot}</strong>
              <small>{text.chatbotDemo}</small>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              aria-label={text.chatbot}
            >
              ✕
            </button>
          </div>

          <div className="chat-body">
            <p className="chat-bubble">
              {text.chatGreeting} {selected?.name || text.category}?
            </p>

            {answer && <p className="chat-bubble">{answer}</p>}
          </div>

          <form className="chat-form" onSubmit={askQuestion}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={text.chatPlaceholder}
              aria-label={text.chatPlaceholder}
            />

            <button type="submit">{text.send}</button>
          </form>
        </section>
      )}
    </div>
  );
}
function VisitorApp() {
  const query = new URLSearchParams(window.location.search);
  const initialLanguage = query.get("lang");
  const [language, setLanguage] = useState(
    supportedLanguageCodes.has(initialLanguage) ? initialLanguage : "",
  );

  useEffect(() => {
    void recordVisit(language);
  }, [language]);

  useEffect(() => {
    if (!language || sessionStorage.getItem("visitorPaid") !== "1") {
      return undefined;
    }

    void recordActivePresence(language);
    const heartbeat = window.setInterval(() => {
      void recordActivePresence(language);
    }, 15000);
    return () => window.clearInterval(heartbeat);
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language || "vi";
    document.title = language
      ? messages[language].appName
      : messages.vi.appName;
  }, [language]);

  function selectLanguage(nextLanguage) {
    if (!supportedLanguageCodes.has(nextLanguage)) {
      return;
    }

    if (sessionStorage.getItem("visitorPaid") !== "1") {
      const checkoutUrl = new URL("/payment", window.location.origin);
      checkoutUrl.searchParams.set("lang", nextLanguage);
      if (query.get("source") === "qr") {
        checkoutUrl.searchParams.set("source", "qr");
      }
      window.location.assign(checkoutUrl);
      return;
    }

    const nextUrl = new URL("/", window.location.origin);
    nextUrl.searchParams.set("lang", nextLanguage);
    if (query.get("source") === "qr") {
      nextUrl.searchParams.set("source", "qr");
    }
    window.history.replaceState(null, "", nextUrl);
    setLanguage(nextLanguage);
  }

  function openLanguageSelection() {
    const nextUrl = new URL("/", window.location.origin);
    if (query.get("source") === "qr") {
      nextUrl.searchParams.set("source", "qr");
    }
    window.history.replaceState(null, "", nextUrl);
    setLanguage("");
  }

  return language ? (
    sessionStorage.getItem("visitorPaid") === "1" ? (
      <MapApp
        key={language}
        language={language}
        onChangeLanguage={selectLanguage}
        onOpenLanguageSelection={openLanguageSelection}
      />
    ) : (
      <RedirectToPayment language={language} source={query.get("source")} />
    )
  ) : (
    <LanguageSelection onSelect={selectLanguage} />
  );
}

function RedirectToPayment({ language, source }) {
  useEffect(() => {
    const url = new URL("/payment", window.location.origin);
    url.searchParams.set("lang", language);
    if (source === "qr") {
      url.searchParams.set("source", "qr");
    }
    window.location.replace(url);
  }, [language, source]);

  return null;
}

function RedirectToHome() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return null;
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/payments") {
    return <RedirectToHome />;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminDashboard />;
  }

  if (pathname === "/staff") {
    return <StaffDashboard />;
  }

  return <VisitorApp />;
}

export default App;
