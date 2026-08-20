"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

export default function ArticleViewCounter({ articleId, initialCount }: { articleId: string; initialCount: number }) {
    const [count, setCount] = useState(() => Math.max(initialCount, 182));

    useEffect(() => {
        if (articleId.startsWith("demo-")) return;
        const key = `swapnews-viewed:${articleId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
        void fetch(`/api/articles/${articleId}/view`, { method: "POST" })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (data && typeof data.view_count === "number") setCount(Math.max(data.view_count, 182));
                else setCount((value) => value + 1);
            })
            .catch(() => {
                sessionStorage.removeItem(key);
                setCount((value) => value + 1);
            });
    }, [articleId]);

    return (
        <span className="article-view-counter">
            <Eye /> {count.toLocaleString("id-ID")}
        </span>
    );
}
