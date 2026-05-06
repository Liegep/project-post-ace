import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface CommentContentProps {
  text: string;
  className?: string;
}

// Detects whether the stored comment text is HTML (from RichTextEditor) or plain text (legacy)
const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

/**
 * Renders comment content. If the stored value is HTML (rich text), it is
 * sanitized and rendered with formatting (lists, headings, bold, etc.).
 * Plain-text comments preserve line breaks via whitespace-pre-wrap.
 */
export function CommentContent({ text, className }: CommentContentProps) {
  if (!text) return null;

  if (looksLikeHtml(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "blockquote", "code", "pre",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "a", "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    });
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none break-words text-black",
          "[&_*]:text-black",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:pl-5 [&_ol]:pl-5",
          "[&_ul]:list-disc [&_ol]:list-decimal",
          "[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
          "[&_a]:underline [&_a]:!text-primary",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <div className={cn("whitespace-pre-wrap break-words", className)}>{text}</div>;
}
