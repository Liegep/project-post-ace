import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { LinkedText } from "@/components/LinkedText";

interface RichCaptionProps {
  text: string;
  className?: string;
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

/**
 * Renders a post caption. If the stored value is HTML (e.g. rich text coming
 * from a text-content sent to the Kanban), it is sanitized and rendered with
 * formatting preserved. Plain-text captions keep the previous LinkedText
 * behavior (auto-linkified URLs).
 */
export function RichCaption({ text, className }: RichCaptionProps) {
  if (!text) return null;

  if (looksLikeHtml(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "u", "s", "blockquote", "code", "pre",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "a", "span", "hr",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    });
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none break-words text-black",
          "[&_*]:text-black",
          "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-5 [&_ol]:pl-5",
          "[&_ul]:list-disc [&_ol]:list-decimal",
          "[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm",
          "[&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-semibold",
          "[&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-2",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic",
          "[&_a]:underline [&_a]:!text-primary",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <LinkedText text={text} className={className} />;
}
