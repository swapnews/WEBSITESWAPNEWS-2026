"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Search, Upload, X, Loader2 } from "lucide-react";

type MediaAsset = {
    id: string;
    public_id: string;
    secure_url: string;
    alt_text: string;
    title: string | null;
    credit: string | null;
    width: number | null;
    height: number | null;
    bytes: number | null;
    created_at: string;
};

type MediaPickerProps = {
    selectedId?: string | null;
    selectedUrl?: string | null;
    selectedAlt?: string | null;
    onSelect: (media: { id: string; url: string; alt: string; publicId: string }) => void;
    onClear?: () => void;
};

export function MediaPicker({ selectedUrl, selectedAlt, onSelect, onClear }: MediaPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"gallery" | "upload">("gallery");
    const [search, setSearch] = useState("");
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Form upload fields
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [altText, setAltText] = useState("");
    const [titleText, setTitleText] = useState("");
    const [creditText, setCreditText] = useState("");

    useEffect(() => {
        if (!isOpen || activeTab !== "gallery") return;

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            setGalleryError(null);
            try {
                const res = await fetch(`/api/cloudinary/upload?search=${encodeURIComponent(search)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || "Gagal memuat galeri");
                setAssets(data.media as MediaAsset[]);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
                setGalleryError(error instanceof Error ? error.message : "Gagal memuat galeri");
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [isOpen, activeTab, search]);

    const handleUploadSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!uploadFile) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("alt_text", altText);
            formData.append("title", titleText);
            formData.append("credit", creditText);

            const res = await fetch("/api/cloudinary/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Gagal mengunggah gambar");
            }

            const media = data.media as MediaAsset;
            onSelect({
                id: media.id,
                url: media.secure_url,
                alt: media.alt_text || media.title || "",
                publicId: media.public_id,
            });

            setIsOpen(false);
            setUploadFile(null);
            setAltText("");
            setTitleText("");
            setCreditText("");
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="media-picker-wrapper">
            {selectedUrl ? (
                <div className="selected-media-box clay-card">
                    <div className="selected-media-preview">
                        <Image src={selectedUrl} alt={selectedAlt || "Preview gambar"} width={640} height={360} unoptimized={selectedUrl.includes("res.cloudinary.com")} />
                    </div>
                    <div className="selected-media-actions">
                        <button type="button" className="secondary-button small" onClick={() => setIsOpen(true)}>
                            <ImagePlus size={14} /> Ganti Gambar
                        </button>
                        {onClear ? (
                            <button type="button" className="secondary-button danger small" onClick={onClear}>
                                <X size={14} /> Hapus
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : (
                <button type="button" className="media-picker-btn clay-card" onClick={() => setIsOpen(true)}>
                    <ImagePlus size={22} />
                    <span>Pilih / Upload Gambar Utama</span>
                    <small>Format WebP otomatis, terkompresi 40% (Quality 60)</small>
                </button>
            )}

            {isOpen ? (
                <div className="media-modal-backdrop" onClick={() => setIsOpen(false)}>
                    <div className="media-modal clay-card" onClick={(e) => e.stopPropagation()}>
                        <header className="media-modal-header">
                            <div className="media-modal-tabs">
                                <button
                                    type="button"
                                    className={activeTab === "gallery" ? "active" : ""}
                                    onClick={() => setActiveTab("gallery")}
                                >
                                    <Search size={15} /> Galeri Media
                                </button>
                                <button
                                    type="button"
                                    className={activeTab === "upload" ? "active" : ""}
                                    onClick={() => setActiveTab("upload")}
                                >
                                    <Upload size={15} /> Upload Baru (WebP 40%)
                                </button>
                            </div>
                            <button type="button" className="media-modal-close" onClick={() => setIsOpen(false)}>
                                <X size={18} />
                            </button>
                        </header>

                        <div className="media-modal-body">
                            {activeTab === "upload" ? (
                                <div className="media-upload-form">
                                    {uploadError ? <div className="auth-alert error">{uploadError}</div> : null}

                                    <label className="file-dropzone">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            required
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setUploadFile(file);
                                                if (file && !titleText) setTitleText(file.name.replace(/\.[^/.]+$/, ""));
                                            }}
                                        />
                                        <Upload size={32} />
                                        <strong>{uploadFile ? uploadFile.name : "Pilih file gambar dari komputer"}</strong>
                                        <small>Akan dikonversi otomatis ke WebP & dikompres 40% oleh Cloudinary</small>
                                    </label>

                                    <div className="media-form-grid">
                                        <label>
                                            Judul Media
                                            <input
                                                type="text"
                                                placeholder="Contoh: Foto Gedung DPR"
                                                value={titleText}
                                                onChange={(e) => setTitleText(e.target.value)}
                                            />
                                        </label>

                                        <label>
                                            Alt Text (SEO & Aksesibilitas)
                                            <input
                                                type="text"
                                                placeholder="Deskripsi singkat gambar"
                                                value={altText}
                                                onChange={(e) => setAltText(e.target.value)}
                                            />
                                        </label>

                                        <label className="full">
                                            Kredit Foto / Fotografer
                                            <input
                                                type="text"
                                                placeholder="Contoh: Antara / Supri"
                                                value={creditText}
                                                onChange={(e) => setCreditText(e.target.value)}
                                            />
                                        </label>
                                    </div>

                                    <div className="media-modal-footer">
                                        <button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            className="primary-button"
                                            disabled={!uploadFile || uploading}
                                            onClick={handleUploadSubmit}
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={16} className="spin" /> Mengompres & Mengunggah...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} /> Unggah & Gunakan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="media-gallery-view">
                                    <div className="media-gallery-search">
                                        <Search size={15} />
                                        <input
                                            type="search"
                                            placeholder="Cari judul, alt text, atau public ID..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>

                                    {galleryError ? <div className="auth-alert error">{galleryError}</div> : null}

                                    {isLoading ? (
                                        <div className="media-modal-note"><Loader2 size={16} className="spin" /> Memuat galeri...</div>
                                    ) : assets.length === 0 ? (
                                        <div className="media-modal-note">Belum ada aset media. Gunakan tab <strong>Upload Baru</strong>.</div>
                                    ) : (
                                        <div className="media-picker-grid">
                                            {assets.map((asset) => (
                                                <button
                                                    type="button"
                                                    className="media-picker-item"
                                                    key={asset.id}
                                                    onClick={() => {
                                                        onSelect({
                                                            id: asset.id,
                                                            url: asset.secure_url,
                                                            alt: asset.alt_text || asset.title || "",
                                                            publicId: asset.public_id,
                                                        });
                                                        setIsOpen(false);
                                                    }}
                                                >
                                                    <Image src={asset.secure_url} alt={asset.alt_text || asset.title || asset.public_id} width={240} height={180} loading="lazy" />
                                                    <span>{asset.title || asset.public_id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
