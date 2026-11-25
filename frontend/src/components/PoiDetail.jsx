import { Headphones, MessageCircle, Navigation } from "lucide-react";
import { resolveImageUrl } from "../utils/imageUrl.js";

export default function PoiDetail({
  place, text, language, routeLoading, onDirections, onToggleAudio, audioLoading,
  playing, onAskGuide,
}) {
  return (
    <section className="detail-section">
      <div className="detail-image">
        <img
          className="detail-image-photo"
          src={resolveImageUrl(place?.imageUrl) || "/Chùa-Linh-Ứng-Bãi-Bụt1.jpg"}
          alt={place?.name || text.category}
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
        <div className="detail-image-overlay">
          <span>{text.currentPlace}</span>
          <h2>{place?.name || text.category}</h2>
        </div>
      </div>
      <div className="detail-content">
        <span className="eyebrow">{text.detailKicker}</span>
        <h2>{place?.name || text.category}</h2>
        <span className="category-tag">{place?.category || text.category}</span>
        <p>{place?.description || text.fallback}</p>
        <div className="detail-actions">
          <button className="outline-button" onClick={onDirections} disabled={!place}>
            <Navigation size={18} />
            {routeLoading
              ? language === "vi" ? "Đang tìm đường…" : "Finding route…"
              : language === "vi" ? "Chỉ đường trên bản đồ" : "Show route on map"}
          </button>
          <button className="primary-button" onClick={onToggleAudio} disabled={place?.translationMissing}>
            <Headphones size={18} />
            {audioLoading ? text.creatingVoice : playing ? text.stopNarration : text.playNarration}
          </button>
          <button className="outline-button" onClick={onAskGuide}>
            <MessageCircle size={18} />{text.askGuide}
          </button>
        </div>
        <p className="demo-note">{place ? text.fromBackend : text.noPlaces}</p>
      </div>
    </section>
  );
}
