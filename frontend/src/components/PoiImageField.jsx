import { useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "../utils/imageUrl.js";

export default function PoiImageField({
  file,
  imageUrl,
  onFileChange,
  onImageUrlChange,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState({ file: null, url: "" });

  useEffect(() => {
    if (!file) {
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [file]);

  const previewUrl = preview.file === file ? preview.url : "";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayedImage = previewUrl || resolveImageUrl(imageUrl);

  return (
    <div className="poi-image-field">
      <label className="poi-image-file-label">
        Ảnh địa điểm
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] || null;
            setPreview({
              file: selectedFile,
              url: selectedFile ? URL.createObjectURL(selectedFile) : "",
            });
            onFileChange(selectedFile);
          }}
        />
      </label>
      <p className="poi-image-help">
        Chọn ảnh JPEG hoặc PNG, tối đa 8 MB. Ảnh được lưu cùng dữ liệu địa điểm.
      </p>
      {displayedImage && (
        <PoiImagePreview key={displayedImage} src={displayedImage} />
      )}
      <label className="poi-image-url-label">
        Hoặc dùng URL ảnh có sẵn
        <input
          type="text"
          inputMode="url"
          value={imageUrl}
          onChange={(event) => onImageUrlChange(event.target.value)}
          maxLength={500}
          placeholder="https://example.com/image.jpg"
        />
      </label>
    </div>
  );
}

function PoiImagePreview({ src }) {
  const [failed, setFailed] = useState(false);

  return (
    <img
      className="poi-image-preview"
      src={src}
      alt="Xem trước ảnh địa điểm"
      hidden={failed}
      onError={() => setFailed(true)}
    />
  );
}
