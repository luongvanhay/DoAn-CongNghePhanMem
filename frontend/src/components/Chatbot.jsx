import { Menu, MessageCircle } from "lucide-react";

export default function Chatbot({
  open, onToggle, onClose, text, selectedPlaceName, messages, loading,
  endRef, onSubmit, question, onQuestionChange,
}) {
  return (
    <>
      <button className="chat-fab" onClick={onToggle} aria-label={open ? "×" : text.chatbot}>
        {open ? <Menu size={23} /> : <MessageCircle size={23} />}
      </button>
      {open && (
        <section className="chat-window">
          <div className="chat-header">
            <span className="chat-avatar">🪷</span>
            <div><strong>{text.chatbot}</strong><small>{text.chatbotDemo}</small></div>
            <button onClick={onClose} aria-label={text.chatbot}>×</button>
          </div>
          <div className="chat-body">
            <p className="chat-bubble">{text.chatGreeting} {selectedPlaceName || text.category}?</p>
            {messages.map((message) => (
              <div className={`chat-message ${message.role === "user" ? "chat-message-user" : ""}`} key={message.id}>
                <p
                  className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : ""} ${message.isError ? "chat-error" : ""}`}
                  role={message.isError ? "alert" : undefined}
                  aria-live={message.role === "assistant" ? "polite" : undefined}
                >{message.content}</p>
                {message.sources?.length > 0 && <p className="chat-sources">{text.chatSource}: {message.sources.join(", ")}</p>}
              </div>
            ))}
            {loading && <p className="chat-bubble" role="status">{text.chatLoading}</p>}
            <div ref={endRef} aria-hidden="true" />
          </div>
          <form className="chat-form" onSubmit={onSubmit}>
            <input
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder={text.chatPlaceholder}
              aria-label={text.chatPlaceholder}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !question.trim()}>
              {loading ? "…" : text.send}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
