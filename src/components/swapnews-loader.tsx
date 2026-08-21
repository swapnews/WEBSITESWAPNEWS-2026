import Image from "next/image";

type SwapNewsLoaderProps = {
    label?: string;
    fullScreen?: boolean;
};

export function SwapNewsLoader({
    label = "Menyiapkan berita untuk Anda…",
    fullScreen = true,
}: SwapNewsLoaderProps) {
    return (
        <main
            className={`swapnews-loader${fullScreen ? " swapnews-loader--fullscreen" : ""}`}
            role="status"
            aria-live="polite"
            aria-label={label}
        >
            <div className="swapnews-loader__ambient" aria-hidden="true" />
            <div className="swapnews-loader__content">
                <div className="swapnews-loader__mark">
                    <span className="swapnews-loader__orbit" aria-hidden="true" />
                    <Image
                        className="swapnews-loader__logo"
                        src="/swapnews-logo-accent.png"
                        alt="SwapNews"
                        width={246}
                        height={72}
                        priority
                    />
                </div>
                <div className="swapnews-loader__rule" aria-hidden="true"><span /></div>
                <p>{label}</p>
                <span className="sr-only">Mohon tunggu, halaman sedang dimuat.</span>
            </div>
        </main>
    );
}
