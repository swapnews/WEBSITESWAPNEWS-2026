export default function HomeLoading() {
    return (
        <div className="news-app" style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ height: 48, background: "var(--skeleton, #e0d6cc)", borderRadius: 8, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} style={{ borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ height: 180, background: "var(--skeleton, #e0d6cc)" }} />
                        <div style={{ padding: 12 }}>
                            <div style={{ height: 16, width: "80%", background: "var(--skeleton, #e0d6cc)", borderRadius: 4, marginBottom: 8 }} />
                            <div style={{ height: 12, width: "60%", background: "var(--skeleton, #e0d6cc)", borderRadius: 4 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
