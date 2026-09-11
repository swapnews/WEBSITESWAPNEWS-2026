export default function cloudinaryLoader({
    src,
    width,
    quality,
}: {
    src: string;
    width: number;
    quality?: number;
}) {
    // Return relative / local paths directly without transformation
    if (src.startsWith("/") || src.startsWith("data:")) {
        return src;
    }

    // Direct Cloudinary URLs optimization
    if (src.includes("res.cloudinary.com")) {
        const parts = src.split("/upload/");
        if (parts.length === 2) {
            const transformations = [
                `f_auto`,
                `q_${quality || "auto"}`,
                `w_${width}`,
                `c_limit`,
            ].join(",");

            // If existing transformations exist, replace or inject
            return `${parts[0]}/upload/${transformations}/${parts[1].replace(/^(?:[a-z]_[a-zA-Z0-9_]+,?)+\//, "")}`;
        }
    }

    return src;
}
