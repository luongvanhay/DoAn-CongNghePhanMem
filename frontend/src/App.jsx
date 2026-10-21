import { useEffect, useState } from "react";
import { getContents } from "./services/contentService";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
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

const languages = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

function mapApiPlace(item) {
  return {
    id: item.id,
    name: item.title || "Địa điểm chưa có tên",
    category: item.location || "Điểm tham quan",
    description: item.body || "Chưa có nội dung thuyết minh.",
    position: [Number(item.latitude), Number(item.longitude)],
    icon: "📍",
  };
}

// Điều khiển bản đồ khi chọn POI hoặc xác định GPS.
function MapController({ place, userPosition }) {
  const map = useMap();

  useEffect(() => {
    if (place) {
      map.flyTo(place.position, 17, { duration: 1 });
    }
  }, [map, place]);

  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 17, { duration: 1 });
    }
  }, [map, userPosition]);

  return null;
}

function App() {
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [language, setLanguage] = useState("vi");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const mapCenter = selected?.position || position || DEFAULT_POSITION;

  // Tải POI từ backend.
  useEffect(() => {
    let cancelled = false;

    async function loadPlaces() {
      setLoading(true);
      setApiError("");

      try {
        const data = await getContents();

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

        if (!cancelled) {
          setPlaces(validPlaces);

          setSelected((current) => {
            if (validPlaces.length === 0) {
              return null;
            }

            return (
              validPlaces.find((place) => place.id === current?.id) ||
              validPlaces[0]
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
  }, [reloadKey]);

  // Dừng thuyết minh khi rời khỏi trang.
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  function toggleAudio() {
    if (!selected) {
      setGpsMessage("Chưa có địa điểm để thuyết minh.");
      return;
    }

    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }

    if (!("speechSynthesis" in window)) {
      setGpsMessage("Trình duyệt chưa hỗ trợ đọc văn bản.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(selected.description);

    speech.lang =
      language === "vi"
        ? "vi-VN"
        : language === "ko"
          ? "ko-KR"
          : language === "zh"
            ? "zh-CN"
            : "en-US";

    speech.onend = () => setPlaying(false);
    speech.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(speech);
    setPlaying(true);
  }

  function askQuestion(event) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    if (!selected) {
      setAnswer(
        "Hiện chưa có địa điểm hợp lệ. Vui lòng thử lại sau khi tải được dữ liệu POI.",
      );
      setQuestion("");
      return;
    }

    setAnswer(
      `Bạn đang hỏi về "${selected.name}". Đây là bản demo giao diện chatbot. Khi tích hợp API chatbot, câu hỏi sẽ được gửi đến backend để xử lý và trả lời.`,
    );

    setQuestion("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">🪷</span>
          <span>
            <strong>Linh Ứng</strong>
            <small>SMART PILGRIMAGE</small>
          </span>
        </a>

        <nav className="desktop-nav">
          <a className="nav-active" href="#map">
            Bản đồ
          </a>
          <a href="#places">Điểm tham quan</a>
          <a href="#guide">Thuyết minh</a>
        </nav>

        <label className="language-picker">
          <Languages size={17} />
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label="Chọn ngôn ngữ"
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              <Compass size={15} /> KHÁM PHÁ SƠN TRÀ
            </span>

            <h1>
              Hành trình tâm linh
              <br />
              giữa thiên nhiên
            </h1>

            <p>
              Khám phá Chùa Linh Ứng, tìm hiểu những công trình tâm linh và lắng
              nghe câu chuyện phía sau mỗi điểm đến.
            </p>

            <button
              className="primary-button"
              onClick={() =>
                document.getElementById("map")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              <Navigation size={18} />
              Bắt đầu tham quan
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>{String(places.length).padStart(2, "0")}</strong>
              <span>Điểm tham quan</span>
            </div>
            <div>
              <strong>GPS</strong>
              <span>Định vị trực tiếp</span>
            </div>
            <div>
              <strong>04</strong>
              <span>Ngôn ngữ mẫu</span>
            </div>
          </div>
        </section>

        <section className="explorer" id="map">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR JOURNEY</span>
              <h2>Bản đồ tham quan</h2>
              <p>Chọn một địa điểm để khám phá chi tiết.</p>
            </div>

            <button className="outline-button" onClick={locateMe}>
              <LocateFixed size={17} />
              Vị trí của tôi
            </button>
          </div>

          {loading && (
            <div className="status-message" role="status">
              Đang tải dữ liệu địa điểm...
            </div>
          )}

          {apiError && (
            <div className="status-message" role="alert">
              <p>Lỗi tải địa điểm: {apiError}</p>
              <button className="outline-button" onClick={retryLoadPlaces}>
                Thử tải lại
              </button>
            </div>
          )}

          {!loading && !apiError && places.length === 0 && (
            <div className="status-message" role="status">
              Chưa có POI hợp lệ. Bản đồ vẫn hoạt động; hãy kiểm tra dữ liệu và
              tọa độ trong backend.
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
                  placeholder="Tìm điểm tham quan..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Tìm điểm tham quan"
                />
              </div>

              <div className="places-count">
                DANH SÁCH ĐỊA ĐIỂM
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
                    {places.length === 0
                      ? "Chưa có địa điểm để hiển thị."
                      : "Không tìm thấy địa điểm."}
                  </p>
                )}
              </div>

              <div className="guide-card" id="guide">
                <span className="guide-icon">
                  <Headphones size={21} />
                </span>

                <div>
                  <strong>Thuyết minh tự động</strong>
                  <p>Nghe giới thiệu về địa điểm đang chọn.</p>
                </div>

                <button
                  className="round-button"
                  onClick={toggleAudio}
                  aria-label={playing ? "Dừng thuyết minh" : "Phát thuyết minh"}
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
                        Xem chi tiết
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
                    <Popup>Vị trí hiện tại của bạn</Popup>
                  </CircleMarker>
                )}

                <MapController place={selected} userPosition={position} />
              </MapContainer>

              <div className="map-label">
                <MapPin size={16} />
                <span>Bán đảo Sơn Trà · Đà Nẵng</span>
              </div>

              <button
                className="map-locate"
                onClick={locateMe}
                aria-label="Xác định vị trí của tôi"
              >
                <LocateFixed size={19} />
              </button>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <div className="detail-image">
            <div className="detail-image-overlay">
              <span>ĐIỂM ĐANG KHÁM PHÁ</span>
              <h2>{selected?.name || "Chùa Linh Ứng"}</h2>
            </div>
          </div>

          <div className="detail-content">
            <span className="eyebrow">EXPLORE & DISCOVER</span>

            <h2>{selected?.name || "Chùa Linh Ứng"}</h2>

            <span className="category-tag">
              {selected?.category || "Điểm tham quan"}
            </span>

            <p>
              {selected?.description ||
                "Chưa có nội dung thuyết minh. Vui lòng bổ sung dữ liệu POI hợp lệ trong backend."}
            </p>

            <div className="detail-actions">
              <button className="primary-button" onClick={toggleAudio}>
                <Headphones size={18} />
                {playing ? "Dừng thuyết minh" : "Nghe thuyết minh"}
              </button>

              <button
                className="outline-button"
                onClick={() => setChatOpen(true)}
              >
                <MessageCircle size={18} />
                Hỏi hướng dẫn viên
              </button>
            </div>

            <p className="demo-note">
              {selected
                ? "Thông tin địa điểm được tải từ backend."
                : "Đang hiển thị thông tin dự phòng vì chưa có POI hợp lệ."}
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="brand">
          <span className="brand-icon">🪷</span>
          <strong>GPS – Chùa Linh Ứng</strong>
        </div>
        <span>Đồ án Công nghệ phần mềm · Web demo</span>
      </footer>

      <button
        className="chat-fab"
        onClick={() => setChatOpen((open) => !open)}
        aria-label={chatOpen ? "Đóng chatbot" : "Mở chatbot"}
      >
        {chatOpen ? <Menu size={23} /> : <MessageCircle size={23} />}
      </button>

      {chatOpen && (
        <section className="chat-window">
          <div className="chat-header">
            <span className="chat-avatar">🪷</span>

            <div>
              <strong>Hướng dẫn viên AI</strong>
              <small>Giao diện minh họa</small>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              aria-label="Đóng chatbot"
            >
              ✕
            </button>
          </div>

          <div className="chat-body">
            <p className="chat-bubble">
              Xin chào! Bạn muốn tìm hiểu điều gì về{" "}
              {selected?.name || "Chùa Linh Ứng"}?
            </p>

            {answer && <p className="chat-bubble">{answer}</p>}
          </div>

          <form className="chat-form" onSubmit={askQuestion}>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Nhập câu hỏi..."
              aria-label="Nhập câu hỏi cho hướng dẫn viên"
            />

            <button type="submit">Gửi</button>
          </form>
        </section>
      )}
    </div>
  );
}

export default App;
