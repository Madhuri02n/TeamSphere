// Shows a green (success) or red (error) box. Shows nothing if text is empty.
export default function Message({ type, text }) {
  if (!text) return null;
  return <div className={`message ${type}`}>{text}</div>;
}
