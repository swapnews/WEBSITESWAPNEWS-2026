"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { Bold, Code, Eraser, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

type Props = { value: string; onChange: (html: string) => void; onImage: () => void; imageToInsert?: { url: string; alt: string } | null; disabled?: boolean };

export function RichArticleEditor({ value, onChange, onImage, imageToInsert, disabled }: Props) {
    const imagePositionRef = useRef<number | null>(null);
    const editor = useEditor({
        immediatelyRender: false,
        editable: !disabled,
        extensions: [StarterKit, Underline, Image.configure({ allowBase64: false, HTMLAttributes: { loading: "lazy" } }), Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } })],
        content: value || "<p></p>",
        editorProps: { attributes: { class: "rich-editor-content", "aria-label": "Isi artikel" } },
        onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    });

    const requestImage = useCallback(() => {
        if (!editor || disabled) return;
        imagePositionRef.current = editor.state.selection.anchor;
        onImage();
    }, [disabled, editor, onImage]);

    useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
    useEffect(() => {
        if (!editor || !imageToInsert?.url) return;
        const savedPosition = imagePositionRef.current;
        const position = savedPosition === null ? editor.state.selection.anchor : Math.min(savedPosition, editor.state.doc.content.size);
        editor.chain().focus().insertContentAt(position, { type: "image", attrs: { src: imageToInsert.url, alt: imageToInsert.alt || "Gambar artikel" } }).run();
        imagePositionRef.current = null;
    }, [editor, imageToInsert]);
    if (!editor) return <div className="rich-editor-loading">Menyiapkan editor visual…</div>;
    const link = () => { const previous = editor.getAttributes("link").href as string | undefined; const url = window.prompt("Tempel URL tujuan", previous || "https://"); if (url === null) return; if (!url.trim()) editor.chain().focus().unsetLink().run(); else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); };
    const tools = [
        ["Paragraf", Pilcrow, () => editor.chain().focus().setParagraph().run(), editor.isActive("paragraph")],
        ["Judul bagian", Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 })],
        ["Subjudul", Heading3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 })],
        ["Tebal", Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
        ["Miring", Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
        ["Garis bawah", UnderlineIcon, () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline")],
        ["Coret", Strikethrough, () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike")],
        ["Bullet", List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
        ["Nomor", ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
        ["Kutipan", Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote")],
        ["Kode", Code, () => editor.chain().focus().toggleCode().run(), editor.isActive("code")],
    ] as const;
    return <div className="rich-article-editor">
        <div className="rich-editor-head"><div><span>VISUAL STORY EDITOR</span><strong>Tulis seperti hasil akhirnya</strong></div><small>{editor.storage.characterCount?.words?.() ?? editor.getText().trim().split(/\s+/).filter(Boolean).length} kata</small></div>
        <div className="rich-editor-toolbar" role="toolbar" aria-label="Format artikel">
            {tools.map(([label, Icon, action, active]) => <button type="button" key={label} title={label} aria-label={label} className={active ? "active" : ""} onClick={action} disabled={disabled}><Icon /></button>)}
            <i />
            <button type="button" title="Link" aria-label="Link" className={editor.isActive("link") ? "active" : ""} onClick={link} disabled={disabled}><Link2 /></button>
            <button type="button" title="Hapus link" aria-label="Hapus link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={disabled}><Unlink /></button>
            <button type="button" title="Sisipkan gambar" aria-label="Sisipkan gambar" onClick={requestImage} disabled={disabled}><ImagePlus /></button>
            <button type="button" title="Bersihkan format" aria-label="Bersihkan format" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} disabled={disabled}><Eraser /></button>
            <i />
            <button type="button" title="Urungkan" aria-label="Urungkan" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 /></button>
            <button type="button" title="Ulangi" aria-label="Ulangi" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 /></button>
        </div>
        {!disabled && <BubbleMenu editor={editor} pluginKey="articleSelectionMenu" appendTo={() => document.body} shouldShow={({ from, to }) => from !== to} options={{ strategy: "fixed", placement: "top", offset: 10, flip: true, shift: { padding: 8 } }} className="rich-context-menu rich-selection-menu" role="toolbar" aria-label="Format teks terpilih">
            <button type="button" aria-label="Tebal" title="Tebal" className={editor.isActive("bold") ? "active" : ""} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></button>
            <button type="button" aria-label="Miring" title="Miring" className={editor.isActive("italic") ? "active" : ""} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></button>
            <button type="button" aria-label="Garis bawah" title="Garis bawah" className={editor.isActive("underline") ? "active" : ""} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></button>
            <button type="button" aria-label="Tambahkan link" title="Tambahkan link" className={editor.isActive("link") ? "active" : ""} onClick={link}><Link2 /></button>
            <button type="button" aria-label="Bersihkan format" title="Bersihkan format" onClick={() => editor.chain().focus().unsetAllMarks().run()}><Eraser /></button>
        </BubbleMenu>}
        {!disabled && <FloatingMenu editor={editor} pluginKey="articleCursorMenu" appendTo={() => document.body} shouldShow={({ editor: currentEditor, state }) => state.selection.empty && state.selection.$from.parent.textContent.length === 0 && currentEditor.isActive("paragraph")} options={{ strategy: "fixed", placement: "bottom-start", offset: 10, flip: true, shift: { padding: 8 } }} className="rich-context-menu rich-cursor-menu" role="toolbar" aria-label="Alat cepat penulisan">
            <button type="button" aria-label="Tebal" title="Tebal" className={editor.isActive("bold") ? "active" : ""} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></button>
            <button type="button" aria-label="Miring" title="Miring" className={editor.isActive("italic") ? "active" : ""} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></button>
            <button type="button" aria-label="Judul bagian" title="Judul bagian" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></button>
            <button type="button" aria-label="Bullet" title="Bullet" onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></button>
            <button type="button" aria-label="Kutipan" title="Kutipan" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></button>
            <button type="button" aria-label="Sisipkan gambar" title="Sisipkan gambar" className="context-image-button" onClick={requestImage}><ImagePlus /></button>
        </FloatingMenu>}
        <EditorContent editor={editor} />
        <div className="rich-editor-foot"><span>Pilih teks untuk format · arahkan kursor untuk alat cepat.</span><b>Gambar & format tersimpan sebagai HTML</b></div>
    </div>;
}
