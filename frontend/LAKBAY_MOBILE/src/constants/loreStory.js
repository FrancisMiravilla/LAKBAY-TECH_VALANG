// The guide tells a place's lore as a short story (QR discovery and Catch
// lore screens). Returns GuideSpeechModal steps; parts with no text are left
// out so the guide never reads a placeholder.

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

const endSentence = (s) => (/[.!?…"”']$/.test(s) ? s : `${s}.`);

export function loreStorySteps({ title, description, history, culture, funFact }) {
  const name = clean(title) || 'this place';
  const parts = [
    { label: 'THE STORY', text: clean(description) },
    { label: 'HISTORY', lead: 'Now, a little history.', firstLead: 'It begins with its history.', text: clean(history) },
    { label: 'CULTURAL SIGNIFICANCE', lead: 'Why does it matter to our culture?', firstLead: 'Here is why it matters to our culture.', text: clean(culture) },
    { label: 'FUN FACT', lead: "And here's a fun fact!", firstLead: "Here's a fun fact!", text: clean(funFact) },
  ].filter((p) => p.text);

  if (!parts.length) return [];

  return parts.map((p, i) => {
    const body = endSentence(p.text);
    if (i === 0) {
      const opener = `Let me tell you a story about ${name}.`;
      return {
        label: p.label,
        title: name,
        text: p.firstLead ? `${opener} ${p.firstLead} ${body}` : `${opener} ${body}`,
      };
    }
    return { label: p.label, title: name, text: `${p.lead} ${body}` };
  });
}
