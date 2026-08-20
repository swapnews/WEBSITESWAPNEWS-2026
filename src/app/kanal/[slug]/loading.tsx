export default function ChannelLoading() {
    return (
        <div className="news-app" style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ height: 28, width: 200, background: "var(--skeleton, #e0d6cc)", borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 300, background: "var(--skeleton, #e0d6cc)", borderRadius: 12, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} style={{ height: 160, background: "var(--skeleton, #e0d6cc)", borderRadius: 10 }} />
                ))}
            </div>
        </div>
    );
}
