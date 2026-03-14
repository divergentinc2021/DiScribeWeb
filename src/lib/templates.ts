export interface Template {
  id: string
  name: string
  icon: string
  description: string
  color: string
  /** The system prompt sent to the LLM to process the transcript */
  prompt: string
  /** Which Worker endpoint to use */
  endpoint: '/api/summarize' | '/api/generate-minutes'
  /** Fields expected in the result (for display) */
  resultFields: ResultField[]
}

export interface ResultField {
  key: string
  label: string
  type: 'text' | 'list' | 'table' | 'discussions' | 'quotes'
}

// ── Template Presets ──

export const templates: Template[] = [
  {
    id: 'meeting-minutes',
    name: 'Meeting Minutes',
    icon: '📋',
    description: 'Professional meeting minutes with attendees, agenda, action items, and decisions',
    color: '#6C5CE7',
    endpoint: '/api/generate-minutes',
    prompt: '', // Uses the Worker's built-in prompt
    resultFields: [
      { key: 'overview', label: 'Executive Summary', type: 'text' },
      { key: 'attendees', label: 'Attendees', type: 'list' },
      { key: 'agenda', label: 'Agenda', type: 'list' },
      { key: 'discussions', label: 'Discussions', type: 'discussions' },
      { key: 'actionItems', label: 'Action Items', type: 'table' },
      { key: 'decisions', label: 'Decisions', type: 'list' },
      { key: 'quotes', label: 'Notable Quotes', type: 'quotes' },
    ]
  },
  {
    id: 'dictation',
    name: 'Dictation Summary',
    icon: '🎙️',
    description: 'Clean up spoken dictation into polished text with key points',
    color: '#2ed573',
    endpoint: '/api/summarize',
    prompt: `You are a dictation assistant. Clean up this spoken dictation into polished, well-structured text.

Transcript:
{transcript}

Respond ONLY with valid JSON:
{
  "overview": "The cleaned-up, polished version of the dictation as flowing prose paragraphs",
  "keyPoints": ["key point 1", "key point 2", ...],
  "actionItems": ["action or follow-up 1", ...],
  "decisions": []
}

Rules:
- Fix grammar, remove filler words (um, uh, like, you know)
- Organize into coherent paragraphs
- Preserve the speaker's intent and meaning
- Extract actionable items mentioned`,
    resultFields: [
      { key: 'overview', label: 'Polished Text', type: 'text' },
      { key: 'keyPoints', label: 'Key Points', type: 'list' },
      { key: 'actionItems', label: 'Follow-ups', type: 'list' },
      { key: 'quotes', label: 'Notable Quotes', type: 'quotes' },
    ]
  },
  {
    id: 'notes-on-self',
    name: 'Notes on Self',
    icon: '🪞',
    description: 'Personal reflection journal — thoughts, goals, and insights',
    color: '#ffa502',
    endpoint: '/api/summarize',
    prompt: `You are a personal reflection assistant. Analyze this spoken personal note/journal entry and organize the thoughts.

Transcript:
{transcript}

Respond ONLY with valid JSON:
{
  "overview": "A thoughtful summary of the reflection in 2-3 sentences",
  "keyPoints": ["insight or thought 1", "insight or thought 2", ...],
  "actionItems": ["personal goal or action 1", ...],
  "decisions": ["decision or resolution 1", ...]
}

Rules:
- Be empathetic and supportive in tone
- Identify patterns in thinking
- Separate actionable goals from observations
- Keep insights concise but meaningful`,
    resultFields: [
      { key: 'overview', label: 'Reflection Summary', type: 'text' },
      { key: 'keyPoints', label: 'Insights & Thoughts', type: 'list' },
      { key: 'actionItems', label: 'Personal Goals', type: 'list' },
      { key: 'decisions', label: 'Resolutions', type: 'list' },
    ]
  },
  {
    id: 'workshop',
    name: 'Workshop Summary',
    icon: '🎓',
    description: 'Capture workshop/lecture content — key learnings, exercises, and takeaways',
    color: '#ff6348',
    endpoint: '/api/summarize',
    prompt: `You are an educational content assistant. Analyze this workshop/lecture/training session recording and extract structured notes.

Transcript:
{transcript}

Respond ONLY with valid JSON:
{
  "overview": "2-3 sentence summary of the workshop topic and main theme",
  "keyPoints": ["key learning 1", "key concept 2", "important technique 3", ...],
  "actionItems": ["exercise or practice task 1", "homework or follow-up 1", ...],
  "decisions": ["key takeaway or conclusion 1", ...]
}

Rules:
- Focus on educational content and learnings
- Extract any exercises, activities, or homework mentioned
- Note recommended resources or references
- Highlight practical applications discussed
- Keep points concise but informative`,
    resultFields: [
      { key: 'overview', label: 'Workshop Overview', type: 'text' },
      { key: 'keyPoints', label: 'Key Learnings', type: 'list' },
      { key: 'actionItems', label: 'Exercises & Follow-ups', type: 'list' },
      { key: 'decisions', label: 'Key Takeaways', type: 'list' },
      { key: 'quotes', label: 'Notable Quotes', type: 'quotes' },
    ]
  },
  {
    id: 'museum',
    name: 'Exhibition Notes',
    icon: '🏛️',
    description: 'Record notes while visiting museums, galleries, or exhibitions',
    color: '#a29bfe',
    endpoint: '/api/summarize',
    prompt: `You are a cultural experience assistant. Analyze these spoken notes from a museum, gallery, or exhibition visit.

Transcript:
{transcript}

Respond ONLY with valid JSON:
{
  "overview": "2-3 sentence summary of the visit — what was seen and overall impressions",
  "keyPoints": ["notable exhibit or artwork 1", "interesting fact 2", "observation 3", ...],
  "actionItems": ["thing to research later 1", "place to revisit 1", ...],
  "decisions": ["favorite piece or highlight 1", "personal reflection 1", ...]
}

Rules:
- Capture specific exhibits, artworks, or displays mentioned
- Note any historical or contextual information shared
- Preserve personal reactions and impressions
- Identify things the visitor wants to learn more about
- Keep the cultural/educational value intact`,
    resultFields: [
      { key: 'overview', label: 'Visit Summary', type: 'text' },
      { key: 'keyPoints', label: 'Notable Exhibits', type: 'list' },
      { key: 'actionItems', label: 'To Research Later', type: 'list' },
      { key: 'decisions', label: 'Highlights & Reflections', type: 'list' },
    ]
  }
]

export function getTemplate(id: string): Template | undefined {
  return templates.find(t => t.id === id)
}

export function getDefaultTemplate(): Template {
  return templates[0]
}
