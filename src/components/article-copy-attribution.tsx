"use client";

import { useEffect } from "react";

export default function ArticleCopyAttribution({ title, excerpt, message }: { title: string; excerpt: string; message: string }) {
    useEffect(() => {
        const article = document.getElementById("article-copy");
        if (!article) return;
        const onCopy = (event: ClipboardEvent) => {
            const selection = window.getSelection()?.toString().trim();
            if (!selection || !event.clipboardData) return;
            const attribution = `\n\n${title}\n${excerpt}\nSource: ${window.location.href}\n${message}`;
            event.preventDefault();
            event.clipboardData.setData("text/plain", selection + attribution);
            event.clipboardData.setData("text/html", `<p>${selection.replaceAll("\n", "<br>")}</p><hr><p><strong>${title}</strong><br>${excerpt}<br>Source: <a href="${window.location.href}">${window.location.href}</a><br>${message}</p>`);
        };
        article.addEventListener("copy", onCopy);
        return () => article.removeEventListener("copy", onCopy);
    }, [excerpt, message, title]);
    return null;
}
