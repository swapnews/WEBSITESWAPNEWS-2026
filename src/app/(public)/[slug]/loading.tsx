export default function ArticleLoading() {
    return (
        <div className="public-article-shell news-app" style={{ padding: "1rem", maxWidth: 760, margin: "0 auto" }}>
            <div style={{ height: 14, width: 120, background: "var(--skeleton, #e0d6cc)", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 32, width: "90%", background: "var(--skeleton, #e0d6cc)", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 24, width: "70%", background: "var(--skeleton, #e0d6cc)", borderRadius: 6, marginBottom: 16 }} />
            <div style={{ height: 400, background: "var(--skeleton, #e0d6cc)", borderRadius: 12, marginBottom: 16 }} />
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{ height: 14, width: `${85 - i * 10}%`, background: "var(--skeleton, #e0d6cc)", borderRadius: 4, marginBottom: 10 }} />
            ))}
        </div>
    );
}
