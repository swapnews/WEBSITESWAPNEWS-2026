import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function getCloudinaryConfig() {
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(
            "Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        );
    }

    return { cloudName, apiKey, apiSecret };
}

export function getCloudinaryClient() {
    const config = getCloudinaryConfig();
    cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
    });

    return cloudinary;
}

/**
 * Builds a Cloudinary URL with WebP format and ~40% compression (quality 60) by default.
 */
export function buildImageUrl(
    publicId: string,
    options?: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string;
        format?: string;
    },
) {
    const config = getCloudinaryConfig();
    const format = options?.format || "webp";
    const quality = options?.quality || "60"; // 40% compression (60% quality)

    const transformationParts = [
        options?.width ? `w_${options.width}` : null,
        options?.height ? `h_${options.height}` : null,
        options?.crop ? `c_${options.crop}` : "c_limit",
        `q_${quality}`,
        `f_${format}`,
    ].filter(Boolean);

    const transformation = transformationParts.join(",");

    // Handle if publicId is already a full URL or data URL
    if (!publicId || publicId.startsWith("http://") || publicId.startsWith("https://") || publicId.startsWith("data:")) {
        return publicId || "";
    }

    try {
        const config = getCloudinaryConfig();
        const format = options?.format || "webp";
        const quality = options?.quality || "60";

        const transformationParts = [
            options?.width ? `w_${options.width}` : null,
            options?.height ? `h_${options.height}` : null,
            options?.crop ? `c_${options.crop}` : "c_limit",
            `q_${quality}`,
            `f_${format}`,
        ].filter(Boolean);

        const transformation = transformationParts.join(",");
        return `https://res.cloudinary.com/${config.cloudName}/image/upload/${transformation}/${publicId}`;
    } catch {
        return publicId;
    }
}
